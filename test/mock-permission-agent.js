#!/usr/bin/env node
import { createInterface } from "readline";

if (process.argv[2] !== "acp") {
  process.stderr.write("mock-permission-agent: usage: mock-permission-agent acp\n");
  process.exit(1);
}

const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: false });
const sessionId = "mock-permission-session-" + Date.now();

let promptRequestId = null;
let permissionRequestId = null;

function permissionOptions() {
  if (String(process.env.MOCK_PERMISSION_OPTIONS || "").toLowerCase() === "allow-only") {
    return [{ optionId: "allow-once" }];
  }
  return [
    { optionId: "allow-once" },
    { optionId: "allow-always" },
    { optionId: "reject-once" },
  ];
}

rl.on("line", (line) => {
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    return;
  }

  const { id, method } = msg;
  if (method === "initialize" || method === "authenticate" || method === "session/load") {
    process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, result: {} }) + "\n");
    return;
  }
  if (method === "session/new") {
    process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, result: { sessionId } }) + "\n");
    return;
  }
  if (method === "session/prompt") {
    promptRequestId = id;
    permissionRequestId = 50001;
    process.stdout.write(JSON.stringify({
      jsonrpc: "2.0",
      id: permissionRequestId,
      method: "session/request_permission",
      params: { options: permissionOptions() },
    }) + "\n");
    return;
  }

  if (id === permissionRequestId && promptRequestId != null) {
    if (msg.result?.outcome?.outcome === "selected") {
      const selected = msg.result.outcome.optionId;
      if (String(selected).startsWith("reject")) {
        process.stdout.write(JSON.stringify({
          jsonrpc: "2.0",
          id: promptRequestId,
          error: { code: "permission_rejected", message: "permission rejected by policy" },
        }) + "\n");
        return;
      }
      process.stdout.write(JSON.stringify({
        jsonrpc: "2.0",
        method: "session/update",
        params: {
          sessionId,
          update: { sessionUpdate: "agent_message_chunk", content: { type: "text", text: "permission granted" } },
        },
      }) + "\n");
      process.stdout.write(JSON.stringify({
        jsonrpc: "2.0",
        id: promptRequestId,
        result: { stopReason: "end_turn", sessionId },
      }) + "\n");
      return;
    }

    process.stdout.write(JSON.stringify({
      jsonrpc: "2.0",
      id: promptRequestId,
      error: { code: "permission_error", message: "permission handling failed" },
    }) + "\n");
  }
});

