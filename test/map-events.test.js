import { acpUpdateToAcpxLines, acpPromptResultToAcpx, toAcpxLine } from "../lib/map-events.js";

const tests = [
  {
    name: "agent_message_chunk -> text",
    in: { params: { update: { sessionUpdate: "agent_message_chunk", content: { type: "text", text: "Hello" } } } },
    expect: [{ type: "text", content: "Hello" }],
  },
  {
    name: "plan -> thought",
    in: { params: { update: { sessionUpdate: "plan", entries: [{ content: "Step one" }] } } },
    expect: [{ type: "thought", content: "Step one" }],
  },
  {
    name: "agent_thought_chunk -> thought",
    in: { params: { update: { sessionUpdate: "agent_thought_chunk", content: { type: "text", text: "Thinking..." } } } },
    expect: [{ type: "thought", content: "Thinking..." }],
  },
  {
    name: "tool_call -> tool_call",
    in: { params: { update: { sessionUpdate: "tool_call", toolCallId: "call_1", title: "read_file", status: "pending" } } },
    expect: [{ type: "tool_call", title: "read_file", status: "pending" }],
  },
  {
    name: "session/prompt result -> done",
    in: { result: { stopReason: "end_turn" } },
    fn: "result",
    expect: { type: "done", stopReason: "end_turn" },
  },
  {
    name: "session/prompt error -> error",
    in: { error: { message: "Failed", code: "RUNTIME" } },
    fn: "result",
    expect: { type: "error", message: "Failed", code: "RUNTIME" },
  },
  {
    name: "session/prompt result without stopReason -> done",
    in: { result: {} },
    fn: "result",
    expect: { type: "done" },
  },
];

let passed = 0;
let failed = 0;
for (const t of tests) {
  if (t.fn === "result") {
    const out = acpPromptResultToAcpx(t.in);
    const ok = out && out.type === t.expect.type && (t.expect.stopReason == null || out.stopReason === t.expect.stopReason) && (t.expect.message == null || out.message === t.expect.message);
    if (ok) {
      passed++;
      console.log("ok map-events " + t.name);
    } else {
      failed++;
      console.error("FAIL map-events " + t.name, "got", out);
    }
  } else {
    const out = acpUpdateToAcpxLines(t.in);
    const ok = Array.isArray(out) && out.length === t.expect.length && t.expect.every((e, i) => out[i] && out[i].type === e.type && (e.content == null || out[i].content === e.content));
    if (ok) {
      passed++;
      console.log("ok map-events " + t.name);
    } else {
      failed++;
      console.error("FAIL map-events " + t.name, "got", out);
    }
  }
}
const line = toAcpxLine({ type: "text", content: "x" });
if (line === '{"type":"text","content":"x"}') {
  passed++;
  console.log("ok map-events toAcpxLine");
} else {
  failed++;
  console.error("FAIL toAcpxLine", line);
}
console.log("map-events tests: " + passed + " passed, " + failed + " failed");
process.exit(failed > 0 ? 1 : 0);
