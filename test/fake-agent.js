#!/usr/bin/env node
if (process.argv[2] !== "acp") {
  process.stderr.write("fake-agent: usage: fake-agent acp\n");
  process.exit(1);
}
import { createInterface } from "readline";
const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: false });
const sessionId = "mock-session-" + Date.now();

rl.on("line", (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  let msg;
  try {
    msg = JSON.parse(trimmed);
  } catch {
    return;
  }
  const id = msg.id;
  const method = msg.method;
  if (method === "initialize") {
    process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, result: {} }) + "\n");
    return;
  }
  if (method === "authenticate") {
    process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, result: {} }) + "\n");
    return;
  }
  if (method === "session/new") {
    process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, result: { sessionId } }) + "\n");
    return;
  }
  if (method === "session/load") {
    process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, result: {} }) + "\n");
    return;
  }
  if (method === "session/prompt") {
    process.stdout.write(JSON.stringify({
      jsonrpc: "2.0", method: "session/update",
      params: { sessionId, update: { sessionUpdate: "agent_message_chunk", content: { type: "text", text: "Mock reply." } } },
    }) + "\n");
    process.stdout.write(JSON.stringify({
      jsonrpc: "2.0", method: "session/update",
      params: { sessionId, update: { sessionUpdate: "agent_message_chunk", content: { type: "text", text: " Done." } } },
    }) + "\n");
    process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, result: { stopReason: "end_turn", sessionId } }) + "\n");
    return;
  }
  if (method === "session/set_mode") {
    process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, result: { sessionId, modeId: msg?.params?.modeId || "agent" } }) + "\n");
    return;
  }
  if (method === "session/set_config_option") {
    process.stdout.write(JSON.stringify({
      jsonrpc: "2.0",
      id,
      result: { sessionId, configId: msg?.params?.configId || "", valueId: msg?.params?.valueId || "" },
    }) + "\n");
    return;
  }
});
