import { createAcpClient } from "../acp-client.js";
import { acpUpdateToAcpxLines, acpPromptResultToAcpx, toAcpxLine } from "../map-events.js";

/**
 * prompt --session <name> --file -: read stdin as prompt, run ACP turn, stream acpx lines to stdout.
 */
export async function run(opts) {
  const { cwd, sessionName, store, stdin } = opts;
  const name = sessionName || opts.name;
  if (!name) {
    process.stderr.write("acp2acpx bridge: prompt requires --session <name>\n");
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
  try {
    for await (const event of client.runTurn(existingSessionId, cwd, promptText)) {
      if (event.type === "update" && event.params) {
        const lines = acpUpdateToAcpxLines({ params: event.params });
        for (const obj of lines) {
          process.stdout.write(toAcpxLine(obj) + "\n");
        }
      } else if (event.type === "result" && event.result) {
        const sessionId = event.result.sessionId;
        if (sessionId && !existingSessionId) {
          await store.set(name, { cursorSessionId: sessionId });
        }
        const doneLine = acpPromptResultToAcpx({ result: event.result });
        if (doneLine) process.stdout.write(toAcpxLine(doneLine) + "\n");
      } else if (event.type === "error") {
        const err = event.error;
        const message = err && err.message ? String(err.message) : "ACP error";
        process.stdout.write(toAcpxLine({ type: "error", message }) + "\n");
        process.exit(1);
      }
    }
  } finally {
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
