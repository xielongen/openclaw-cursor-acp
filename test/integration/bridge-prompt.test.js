/**
 * Integration: run bridge with cursor prompt; use mock ACP server (fake-agent.js) as agent.
 * Asserts stdout contains type "text" and type "done".
 */
import { spawn } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "../..");
const bridgePath = join(projectRoot, "bin/bridge.js");
const fakeAgentPath = join(projectRoot, "test/fake-agent.js");

const argv = [
  "--format", "json", "--json-strict", "--cwd", projectRoot,
  "cursor", "prompt", "--session", "integration-test-session", "--file", "-",
];

const env = {
  ...process.env,
  ACP_AGENT_BIN: fakeAgentPath,
  OPENCLAW_CURSOR_ACP_SESSIONS_FILE: join(projectRoot, "test/.sessions-integration.json"),
};

const child = spawn("node", [bridgePath, ...argv], {
  cwd: projectRoot,
  env,
  stdio: ["pipe", "pipe", "pipe"],
});

let stdout = "";
let stderr = "";
child.stdout.on("data", (chunk) => { stdout += chunk; });
child.stderr.on("data", (chunk) => { stderr += chunk; });
child.stdin.write("Hello mock\n");
child.stdin.end();

child.on("close", (code) => {
  const lines = stdout.split(/\r?\n/).filter(Boolean);
  const types = lines.map((l) => {
    try {
      const o = JSON.parse(l);
      return o.type;
    } catch {
      return null;
    }
  }).filter(Boolean);
  const hasText = types.some((t) => t === "text");
  const hasDone = types.some((t) => t === "done");
  const hasError = types.some((t) => t === "error");
  if (hasText && hasDone && !hasError && code === 0) {
    console.log("ok integration bridge-prompt");
    process.exit(0);
  } else {
    console.error("FAIL integration bridge-prompt: hasText=" + hasText + " hasDone=" + hasDone + " hasError=" + hasError + " code=" + code);
    console.error("stdout:", stdout.slice(0, 500));
    if (stderr) console.error("stderr:", stderr.slice(0, 300));
    process.exit(1);
  }
});
