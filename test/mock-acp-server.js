#!/usr/bin/env node
/**
 * Mock ACP server: responds to initialize, authenticate, session/new, session/load, session/prompt.
 * For session/prompt we send a few session/update (agent_message_chunk) then session/prompt result.
 */
import { createInterface } from "readline";

const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: false });
let nextId = 1;
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
      jsonrpc: "2.0",
      method: "session/update",
      params: { sessionId, update: { sessionUpdate: "agent_message_chunk", content: { type: "text", text: "Mock reply." } } },
    }) + "\n");
    process.stdout.write(JSON.stringify({
      jsonrpc: "2.0",
      method: "session/update",
      params: { sessionId, update: { sessionUpdate: "agent_message_chunk", content: { type: "text", text: " Done." } } },
    }) + "\n");
    process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, result: { stopReason: "end_turn", sessionId } }) + "\n");
    return;
  }
});
