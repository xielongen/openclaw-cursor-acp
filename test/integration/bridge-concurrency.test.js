/**
 * Integration: run two prompt sessions concurrently and ensure both complete.
 */
import { spawn } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "../..");
const bridgePath = join(projectRoot, "bin/bridge.js");
const fakeAgentPath = join(projectRoot, "test/fake-agent.js");

function runPrompt(sessionName, text) {
  return new Promise((resolve) => {
    const child = spawn("node", [
      bridgePath,
      "--format", "json", "--json-strict", "--cwd", projectRoot,
      "cursor", "prompt", "--session", sessionName, "--file", "-",
    ], {
      cwd: projectRoot,
      env: {
        ...process.env,
        ACP_AGENT_BIN: fakeAgentPath,
        OPENCLAW_CURSOR_ACP_SESSIONS_FILE: join(projectRoot, "test/.sessions-concurrency.json"),
      },
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (c) => { stdout += c; });
    child.stderr.on("data", (c) => { stderr += c; });
    child.stdin.end(text + "\n");
    child.on("close", (code) => {
      const lines = stdout.split(/\r?\n/).filter(Boolean).map((line) => {
        try { return JSON.parse(line); } catch { return null; }
      }).filter(Boolean);
      const hasDone = lines.some((o) => o.type === "done");
      const hasError = lines.some((o) => o.type === "error");
      const hasText = lines.some((o) => o.type === "text");
      resolve({ code, hasDone, hasError, hasText, stdout, stderr });
    });
  });
}

const [a, b] = await Promise.all([
  runPrompt("conc-a", "hello a"),
  runPrompt("conc-b", "hello b"),
]);

if (
  a.code === 0 && b.code === 0 &&
  a.hasDone && b.hasDone &&
  a.hasText && b.hasText &&
  !a.hasError && !b.hasError
) {
  console.log("ok integration bridge-concurrency");
  process.exit(0);
}

console.error("FAIL bridge-concurrency", { a, b });
process.exit(1);

