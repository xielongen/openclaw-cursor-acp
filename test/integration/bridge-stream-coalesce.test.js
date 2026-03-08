/**
 * Integration: chunked text updates should be coalesced into fewer text lines.
 */
import { spawn } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "../..");
const bridgePath = join(projectRoot, "bin/bridge.js");
const fakeAgentPath = join(projectRoot, "test/fake-agent.js");

const child = spawn("node", [
  bridgePath,
  "--format", "json", "--json-strict", "--cwd", projectRoot,
  "cursor", "prompt", "--session", "stream-coalesce-session", "--file", "-",
], {
  cwd: projectRoot,
  env: {
    ...process.env,
    ACP_AGENT_BIN: fakeAgentPath,
    OPENCLAW_CURSOR_ACP_STREAM_MIN_CHARS: "9999",
    OPENCLAW_CURSOR_ACP_STREAM_FLUSH_MS: "10000",
  },
  stdio: ["pipe", "pipe", "pipe"],
});

let stdout = "";
let stderr = "";
child.stdout.on("data", (chunk) => { stdout += chunk; });
child.stderr.on("data", (chunk) => { stderr += chunk; });
child.stdin.end("Hello mock\n");

child.on("close", (code) => {
  const lines = stdout.split(/\r?\n/).filter(Boolean).map((line) => {
    try { return JSON.parse(line); } catch { return null; }
  }).filter(Boolean);

  const textLines = lines.filter((o) => o.type === "text");
  const hasDone = lines.some((o) => o.type === "done");
  const hasError = lines.some((o) => o.type === "error");
  const coalesced = textLines.some((o) => String(o.content || "").includes("Mock reply. Done."));
  if (code === 0 && hasDone && !hasError && coalesced) {
    console.log("ok integration bridge-stream-coalesce");
    process.exit(0);
  }
  console.error("FAIL bridge-stream-coalesce", { code, textLines, hasDone, hasError, stdout, stderr });
  process.exit(1);
});

