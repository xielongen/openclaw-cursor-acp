import { createAcpClient } from "../acp-client.js";
import { acpUpdateToAcpxLines, acpPromptResultToAcpx, toAcpxLine } from "../map-events.js";

/**
 * prompt --session <name> --file -: read stdin as prompt, run ACP turn, stream acpx lines to stdout.
 */
export async function run(opts) {
  const { cwd, sessionName, store, stdin } = opts;
  const name = sessionName || opts.name;
  if (!name) {
    process.stderr.write("openclaw-cursor-acp bridge: prompt requires --session <name>\n");
    process.exit(2);
  }
  const promptText = typeof stdin === "string" ? stdin : await readStdin();
  if (!promptText.trim()) {
    process.stdout.write(toAcpxLine({ type: "error", message: "empty prompt" }) + "\n");
    process.exit(1);
  }

  const entry = store.get(name);
  const existingSessionId = entry ? entry.cursorSessionId : null;

  const client = createAcpClient(cwd, process.env);
  const emitPhaseReceipts = !/^(0|false|no|off)$/i.test(String(process.env.OPENCLAW_CURSOR_ACP_PHASE_RECEIPTS || "1"));
  const phaseProgressEvery = parsePositiveInt(process.env.OPENCLAW_CURSOR_ACP_PHASE_PROGRESS_EVERY, 5);
  const startedAt = Date.now();
  let updateCount = 0;
  let emittedTextLines = 0;
  let emittedThoughtLines = 0;
  let emittedToolCallLines = 0;
  let phaseDoneEmitted = false;
  const streamFlushMs = parsePositiveInt(process.env.OPENCLAW_CURSOR_ACP_STREAM_FLUSH_MS, 300);
  const streamMinChars = parsePositiveInt(process.env.OPENCLAW_CURSOR_ACP_STREAM_MIN_CHARS, 80);
  let pendingText = "";
  let pendingThought = "";
  let flushTimer = null;

  function emitLine(obj) {
    if (obj.type === "text") emittedTextLines += 1;
    if (obj.type === "thought") emittedThoughtLines += 1;
    if (obj.type === "tool_call") emittedToolCallLines += 1;
    process.stdout.write(toAcpxLine(obj) + "\n");
  }

  function flushBuffered() {
    if (pendingThought) {
      emitLine({ type: "thought", content: pendingThought });
      pendingThought = "";
    }
    if (pendingText) {
      emitLine({ type: "text", content: pendingText });
      pendingText = "";
    }
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
  }

  function scheduleFlush() {
    if (streamFlushMs <= 0 || flushTimer) return;
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flushBuffered();
    }, streamFlushMs);
  }

  function enqueueLine(obj) {
    if (obj.type === "thought" && typeof obj.content === "string") {
      pendingThought += obj.content;
      if (pendingThought.length >= streamMinChars) {
        flushBuffered();
      } else {
        scheduleFlush();
      }
      return;
    }
    if (obj.type === "text" && typeof obj.content === "string") {
      pendingText += obj.content;
      if (pendingText.length >= streamMinChars) {
        flushBuffered();
      } else {
        scheduleFlush();
      }
      return;
    }
    flushBuffered();
    emitLine(obj);
  }

  function emitPhase(stage, extra = {}) {
    if (!emitPhaseReceipts) return;
    process.stdout.write(toAcpxLine({
      type: "thought",
      content: `[receipt] ${stage}`,
      stage,
      ...extra,
    }) + "\n");
  }

  emitPhase("phase_start", {
    sessionName: name,
    hasExistingSession: Boolean(existingSessionId),
  });
  try {
    for await (const event of client.runTurn(existingSessionId, cwd, promptText)) {
      if (event.type === "update" && event.params) {
        updateCount += 1;
        const lines = acpUpdateToAcpxLines({ params: event.params });
        for (const obj of lines) {
          enqueueLine(obj);
        }
        if (updateCount === 1 || updateCount % phaseProgressEvery === 0) {
          emitPhase("phase_progress", {
            updateCount,
            emittedTextLines,
            emittedThoughtLines,
            emittedToolCallLines,
          });
        }
      } else if (event.type === "result" && event.result) {
        flushBuffered();
        const sessionId = event.result.sessionId;
        if (sessionId && !existingSessionId) {
          await store.set(name, { cursorSessionId: sessionId });
        }
        const doneLine = acpPromptResultToAcpx({ result: event.result });
        if (doneLine) emitLine(doneLine);
        emitPhase("phase_done", {
          outcome: "ok",
          stopReason: event.result.stopReason || null,
          sessionId: sessionId || existingSessionId || null,
          updateCount,
          elapsedMs: Date.now() - startedAt,
          emittedTextLines,
          emittedThoughtLines,
          emittedToolCallLines,
        });
        phaseDoneEmitted = true;
      } else if (event.type === "error") {
        flushBuffered();
        const err = event.error;
        const message = err && err.message ? String(err.message) : "ACP error";
        emitPhase("phase_done", {
          outcome: "error",
          message,
          updateCount,
          elapsedMs: Date.now() - startedAt,
          emittedTextLines,
          emittedThoughtLines,
          emittedToolCallLines,
        });
        phaseDoneEmitted = true;
        emitLine({ type: "error", message });
        process.exit(1);
      }
    }
  } finally {
    flushBuffered();
    if (!phaseDoneEmitted) {
      emitPhase("phase_done", {
        outcome: "unknown",
        updateCount,
        elapsedMs: Date.now() - startedAt,
        emittedTextLines,
        emittedThoughtLines,
        emittedToolCallLines,
      });
    }
    client.close();
  }
}

function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => chunks.push(chunk));
    process.stdin.on("end", () => resolve(chunks.join("")));
    process.stdin.on("error", reject);
  });
}

function parsePositiveInt(raw, fallback) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}
