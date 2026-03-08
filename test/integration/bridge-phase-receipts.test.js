/**
 * Integration: prompt should emit phase receipts (start/progress/done) by default.
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
  "cursor", "prompt", "--session", "phase-receipt-session", "--file", "-",
], {
  cwd: projectRoot,
  env: {
    ...process.env,
    ACP_AGENT_BIN: fakeAgentPath,
    OPENCLAW_CURSOR_ACP_SESSIONS_FILE: join(projectRoot, "test/.sessions-phase.json"),
    OPENCLAW_CURSOR_ACP_PHASE_PROGRESS_EVERY: "1",
  },
  stdio: ["pipe", "pipe", "pipe"],
});

let stdout = "";
let stderr = "";
child.stdout.on("data", (chunk) => { stdout += chunk; });
child.stderr.on("data", (chunk) => { stderr += chunk; });
child.stdin.end("hi\n");

child.on("close", (code) => {
  const lines = stdout.split(/\r?\n/).filter(Boolean).map((line) => {
    try { return JSON.parse(line); } catch { return null; }
  }).filter(Boolean);

  const hasStart = lines.some((o) => o.stage === "phase_start");
  const hasProgress = lines.some((o) => o.stage === "phase_progress");
  const doneReceipt = lines.find((o) => o.stage === "phase_done");
  const hasDone = lines.some((o) => o.type === "done");
  const hasError = lines.some((o) => o.type === "error");

  if (code === 0 && hasStart && hasProgress && doneReceipt?.outcome === "ok" && hasDone && !hasError) {
    console.log("ok integration bridge-phase-receipts");
    process.exit(0);
  }
  console.error("FAIL bridge-phase-receipts", { code, hasStart, hasProgress, doneReceipt, hasDone, hasError, stdout, stderr });
  process.exit(1);
});

