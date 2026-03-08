import { spawn } from "child_process";
import { createInterface } from "readline";

/**
 * @param {string} cwd
 * @param {Record<string, string>} [env]
 * @returns {{ initialize: () => Promise<void>, authenticate: () => Promise<void>, sessionNew: (cwd: string) => Promise<string>, sessionLoad: (sessionId: string) => Promise<void>, sessionPrompt: (sessionId: string, promptText: string) => Promise<unknown>, runTurn: (existingSessionId: string | null, cwdPath: string, promptText: string) => AsyncGenerator<{ type: 'update', params: unknown } | { type: 'result', result: unknown } | { type: 'error', error: unknown }, void, unknown>, close: () => void }}
 */
export function createAcpClient(cwd, env = {}) {
  const agentBin = process.env.ACP_AGENT_BIN || "agent";
  const isNodeScript = agentBin.endsWith(".js");
  const child = spawn(isNodeScript ? "node" : agentBin, isNodeScript ? [agentBin, "acp"] : ["acp"], {
    cwd,
    env: { ...process.env, ...env },
    stdio: ["pipe", "pipe", "inherit"],
  });

  // Use a high client id range to avoid collisions with server-originated request IDs.
  let nextId = 10000;
  let initialized = false;
  let authenticated = false;
  let initResult = null;
  const pending = new Map();
  const updateQueue = [];
  let updateResolver = null;

  class RpcError extends Error {
    /**
     * @param {number | string | undefined} code
     * @param {string} message
     * @param {unknown} data
     */
    constructor(code, message, data) {
      super(message);
      this.name = "RpcError";
      this.code = code;
      this.data = data;
    }
  }

  /**
   * @param {unknown} value
   * @returns {boolean}
   */
  function isRecord(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function send(method, params) {
    return new Promise((resolve, reject) => {
      const id = nextId++;
      const msg = { jsonrpc: "2.0", id, method, params };
      pending.set(id, { resolve, reject });
      child.stdin.write(JSON.stringify(msg) + "\n", (err) => {
        if (err) reject(err);
      });
    });
  }

  const rl = createInterface({ input: child.stdout, crlfDelay: Infinity });
  rl.on("line", (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    let msg;
    try {
      msg = JSON.parse(trimmed);
    } catch {
      return;
    }
    if (msg.method === "session/update" && msg.params) {
      updateQueue.push({ type: "update", params: msg.params });
      if (updateResolver) {
        const r = updateResolver;
        updateResolver = null;
        r();
      }
      return;
    }
    if (msg.method === "session/request_permission" && msg.id != null) {
      try {
        const options = Array.isArray(msg?.params?.options) ? msg.params.options : [];
        const preferred = options.find((opt) => opt?.optionId === "allow-always")
          || options.find((opt) => opt?.optionId === "allow-once")
          || options.find((opt) => opt?.id === "allow-always")
          || options.find((opt) => opt?.id === "allow-once")
          || options[0];
        const optionId = preferred?.optionId || preferred?.id || "allow-once";
        child.stdin.write(
          JSON.stringify({
            jsonrpc: "2.0",
            id: msg.id,
            result: { outcome: { outcome: "selected", optionId } },
          }) + "\n",
        );
      } catch (_) { }
      return;
    }
    if (msg.id != null && (msg.result !== undefined || msg.error !== undefined)) {
      const p = pending.get(msg.id);
      if (p) {
        pending.delete(msg.id);
        if (msg.error) {
          p.reject(new RpcError(msg.error.code, msg.error.message || JSON.stringify(msg.error), msg.error.data));
        }
        else p.resolve(msg.result);
      }
    }
  });

  async function initialize() {
    if (initialized) {
      return initResult;
    }
    const result = await send("initialize", {
      protocolVersion: 1,
      clientCapabilities: { fs: { readTextFile: false, writeTextFile: false }, terminal: false },
      clientInfo: { name: "openclaw-cursor-acp-bridge", version: "0.1.0" },
    });
    initialized = true;
    initResult = isRecord(result) ? result : null;
    return initResult;
  }

  async function authenticate() {
    const init = await initialize();
    const methods = Array.isArray(init?.authMethods) ? init.authMethods : [];
    const method = methods.find((m) => (m?.id || m?.methodId) === "cursor_login");
    if (!method || authenticated) {
      return;
    }
    await send("authenticate", { methodId: "cursor_login" });
    authenticated = true;
  }

  /**
   * @param {() => Promise<unknown>} fn
   * @returns {Promise<unknown>}
   */
  async function withAuthRetry(fn) {
    try {
      return await fn();
    } catch (err) {
      const code = err && typeof err === "object" ? err.code : undefined;
      const msg = err && typeof err === "object" && "message" in err ? String(err.message) : String(err);
      if (code === "auth_required" || /auth_required/i.test(msg)) {
        await authenticate();
        return await fn();
      }
      throw err;
    }
  }

  async function sessionNew(cwdPath) {
    const result = await withAuthRetry(() => send("session/new", { cwd: cwdPath, mcpServers: [] }));
    return result && result.sessionId ? result.sessionId : null;
  }

  async function sessionLoad(sessionId, cwdPath) {
    await withAuthRetry(() => send("session/load", { sessionId, cwd: cwdPath, mcpServers: [] }));
  }

  async function sessionPrompt(sessionId, promptText) {
    return withAuthRetry(() => send("session/prompt", {
      sessionId,
      prompt: [{ type: "text", text: promptText }],
    }));
  }

  function close() {
    try {
      rl.close();
      child.stdin.end();
    } catch (_) { }
    try {
      child.kill("SIGTERM");
    } catch (_) { }
  }

  function nextUpdate() {
    return new Promise((resolve) => {
      if (updateQueue.length > 0) resolve();
      else updateResolver = resolve;
    });
  }

  function parseOptionalMs(raw) {
    if (raw == null || raw === "") return 0;
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.floor(n);
  }

  async function* runTurn(existingSessionId, cwdPath, promptText) {
    await initialize();
    await authenticate().catch(() => { });
    let sessionId = existingSessionId;
    if (!sessionId) {
      sessionId = await sessionNew(cwdPath);
      if (!sessionId) throw new Error("session/new did not return sessionId");
    } else {
      try {
        await sessionLoad(sessionId, cwdPath);
      } catch (err) {
        const code = err && typeof err === "object" ? err.code : undefined;
        const msg = err && typeof err === "object" && "message" in err ? String(err.message) : String(err);
        // Fall back to a new session if previous one no longer exists.
        if (code === "invalid_params" || /not found|unknown session|invalid.*session/i.test(msg)) {
          sessionId = await sessionNew(cwdPath);
        } else {
          throw err;
        }
      }
    }

    const promptPromise = sessionPrompt(sessionId, promptText).then(
      (r) => ({ type: "result", result: { ...(isRecord(r) ? r : {}), sessionId } }),
      (e) => ({ type: "error", error: e })
    );

    // Timeout strategy:
    // - No default hard timeout. If the agent is still making progress, do not cut it off.
    // - Optional idle timeout: fail only when no updates/final response arrive for a while.
    // - Optional hard timeout: available for explicit operator control only.
    const hardTimeoutMs = parseOptionalMs(process.env.ACP_TURN_TIMEOUT_MS || process.env.ACP_HARD_TIMEOUT_MS);
    const idleTimeoutMs = parseOptionalMs(process.env.ACP_IDLE_TIMEOUT_MS);
    const startedAt = Date.now();
    let lastProgressAt = startedAt;
    let final = null;
    promptPromise.then((r) => { final = r; if (updateResolver) updateResolver(); });

    while (true) {
      if (updateQueue.length > 0) {
        const u = updateQueue.shift();
        if (u) {
          lastProgressAt = Date.now();
          yield u;
        }
        continue;
      }
      if (final) {
        yield final;
        return;
      }

      const now = Date.now();
      if (hardTimeoutMs > 0 && now - startedAt >= hardTimeoutMs) {
        yield { type: "error", error: new Error(`runTurn hard timeout after ${hardTimeoutMs}ms`) };
        return;
      }
      if (idleTimeoutMs > 0 && now - lastProgressAt >= idleTimeoutMs) {
        yield { type: "error", error: new Error(`runTurn idle timeout after ${idleTimeoutMs}ms without progress`) };
        return;
      }

      if (hardTimeoutMs === 0 && idleTimeoutMs === 0) {
        await nextUpdate();
        continue;
      }

      const waitMsCandidates = [1000];
      if (hardTimeoutMs > 0) waitMsCandidates.push(Math.max(1, hardTimeoutMs - (now - startedAt)));
      if (idleTimeoutMs > 0) waitMsCandidates.push(Math.max(1, idleTimeoutMs - (now - lastProgressAt)));
      const waitMs = Math.max(1, Math.min(...waitMsCandidates));

      await Promise.race([
        nextUpdate(),
        new Promise((resolve) => setTimeout(resolve, waitMs)),
      ]);
    }
  }

  return {
    initialize,
    authenticate,
    sessionNew,
    sessionLoad,
    sessionPrompt,
    runTurn,
    close,
  };
}
