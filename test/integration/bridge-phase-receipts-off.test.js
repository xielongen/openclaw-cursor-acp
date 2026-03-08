/**
 * Integration: receipts can be disabled.
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
  "cursor", "prompt", "--session", "phase-off-session", "--file", "-",
], {
  cwd: projectRoot,
  env: {
    ...process.env,
    ACP_AGENT_BIN: fakeAgentPath,
    OPENCLAW_CURSOR_ACP_PHASE_RECEIPTS: "0",
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

  const hasStage = lines.some((o) => typeof o.stage === "string");
  const hasDone = lines.some((o) => o.type === "done");
  const hasError = lines.some((o) => o.type === "error");

  if (code === 0 && !hasStage && hasDone && !hasError) {
    console.log("ok integration bridge-phase-receipts-off");
    process.exit(0);
  }
  console.error("FAIL bridge-phase-receipts-off", { code, hasStage, hasDone, hasError, stdout, stderr });
  process.exit(1);
});

