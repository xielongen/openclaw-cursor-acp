/**
 * Integration: idle soft-recovery should keep turn alive until final result.
 */
import { spawn } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "../..");
const bridgePath = join(projectRoot, "bin/bridge.js");
const mockIdleAgentPath = join(projectRoot, "test/mock-idle-agent.js");

const child = spawn("node", [
  bridgePath,
  "--format", "json", "--json-strict", "--cwd", projectRoot,
  "cursor", "prompt", "--session", "idle-recovery-session", "--file", "-",
], {
  cwd: projectRoot,
  env: {
    ...process.env,
    ACP_AGENT_BIN: mockIdleAgentPath,
    ACP_IDLE_TIMEOUT_MS: "80",
    ACP_IDLE_AUTO_RECOVER: "1",
    ACP_IDLE_RECOVER_MAX: "5",
  },
  stdio: ["pipe", "pipe", "pipe"],
});

let stdout = "";
let stderr = "";
child.stdout.on("data", (c) => { stdout += c; });
child.stderr.on("data", (c) => { stderr += c; });
child.stdin.end("hello\n");

child.on("close", (code) => {
  const lines = stdout.split(/\r?\n/).filter(Boolean).map((s) => {
    try { return JSON.parse(s); } catch { return null; }
  }).filter(Boolean);
  const hasRecoveryThought = lines.some((o) => o.type === "thought" && String(o.content || "").includes("idle recovery attempt"));
  const hasDone = lines.some((o) => o.type === "done");
  const hasError = lines.some((o) => o.type === "error");
  if (code === 0 && hasRecoveryThought && hasDone && !hasError) {
    console.log("ok integration bridge-idle-recovery");
    process.exit(0);
  }
  console.error("FAIL bridge-idle-recovery", { code, hasRecoveryThought, hasDone, hasError, stdout, stderr });
  process.exit(1);
});

