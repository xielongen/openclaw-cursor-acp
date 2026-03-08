#!/usr/bin/env node
import { createInterface } from "readline";

if (process.argv[2] !== "acp") {
  process.stderr.write("mock-idle-agent: usage: mock-idle-agent acp\n");
  process.exit(1);
}

const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: false });
const sessionId = "mock-idle-session-" + Date.now();

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
    setTimeout(() => {
      process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, result: { stopReason: "end_turn", sessionId } }) + "\n");
    }, 220);
    return;
  }
});

