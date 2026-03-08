/**
 * Map ACP session/update and session/prompt result to acpx JSON line(s).
 * acpx expects: type text|thought|tool_call|done|error with content/title/status/stopReason/message.
 */

/**
 * @param {{ method?: string, params?: { update?: { sessionUpdate?: string, content?: { type?: string, text?: string }, entries?: Array<{ content?: string }>, toolCallId?: string, title?: string, kind?: string, status?: string } } }} msg - ACP notification (session/update) or similar
 * @returns {Array<{ type: string, content?: string, title?: string, status?: string, stopReason?: string, message?: string, code?: string }>} acpx-form lines (0 or more)
 */
export function acpUpdateToAcpxLines(msg) {
  if (!msg || typeof msg !== "object") return [];
  const params = msg.params || msg;
  const update = params.update;
  if (!update || typeof update !== "object") return [];

  const sessionUpdate = update.sessionUpdate;
  const lines = [];

  if ((sessionUpdate === "agent_message_chunk" || sessionUpdate === "agent_message") && update.content) {
    const text = update.content.type === "text" && update.content.text != null ? String(update.content.text) : "";
    if (text) lines.push({ type: "text", content: text });
    return lines;
  }

  if (sessionUpdate === "agent_thought_chunk" && update.content) {
    const thought = update.content.type === "text" && update.content.text != null ? String(update.content.text) : "";
    if (thought) lines.push({ type: "thought", content: thought });
    return lines;
  }

  if (sessionUpdate === "plan" && Array.isArray(update.entries)) {
    const first = update.entries.find((e) => e && e.content);
    if (first && first.content) lines.push({ type: "thought", content: first.content });
    return lines;
  }

  if (sessionUpdate === "tool_call" || sessionUpdate === "tool_call_update") {
    const title = update.title || update.toolCallId || "tool";
    const status = update.status || (sessionUpdate === "tool_call_update" ? "in_progress" : "pending");
    lines.push({ type: "tool_call", title, status });
    return lines;
  }

  return lines;
}

/**
 * @param {{ result?: { stopReason?: string }, error?: { message?: string, code?: string } }} msg - session/prompt response
 * @returns {{ type: string, stopReason?: string, message?: string, code?: string } | null}
 */
export function acpPromptResultToAcpx(msg) {
  if (!msg || typeof msg !== "object") return null;
  if (msg.error) {
    return {
      type: "error",
      message: msg.error.message || "ACP error",
      code: msg.error.code,
    };
  }
  if (msg.result) {
    return msg.result.stopReason != null
      ? { type: "done", stopReason: msg.result.stopReason }
      : { type: "done" };
  }
  return null;
}

/**
 * Write one acpx JSON line to stdout (no newline added by this function; caller adds).
 * @param {Record<string, unknown>} obj
 * @returns {string}
 */
export function toAcpxLine(obj) {
  return JSON.stringify(obj);
}
