/**
 * Integration: permission policy matrix for session/request_permission handling.
 */
import { spawn } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "../..");
const bridgePath = join(projectRoot, "bin/bridge.js");
const mockPermissionAgentPath = join(projectRoot, "test/mock-permission-agent.js");

function runCase({ sessionName, permissionMode, optionsMode }) {
  return new Promise((resolve) => {
    const child = spawn("node", [
      bridgePath,
      "--format", "json", "--json-strict", "--cwd", projectRoot,
      "cursor", "prompt", "--session", sessionName, "--file", "-",
    ], {
      cwd: projectRoot,
      env: {
        ...process.env,
        ACP_AGENT_BIN: mockPermissionAgentPath,
        OPENCLAW_CURSOR_ACP_PERMISSION_MODE: permissionMode,
        MOCK_PERMISSION_OPTIONS: optionsMode,
      },
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (c) => { stdout += c; });
    child.stderr.on("data", (c) => { stderr += c; });
    child.stdin.end("permission test\n");
    child.on("close", (code) => {
      const objs = stdout.split(/\r?\n/).filter(Boolean).map((line) => {
        try { return JSON.parse(line); } catch { return null; }
      }).filter(Boolean);
      resolve({
        code,
        hasDone: objs.some((o) => o.type === "done"),
        hasError: objs.some((o) => o.type === "error"),
        stdout,
        stderr,
      });
    });
  });
}

const allowOnce = await runCase({
  sessionName: "perm-allow-once",
  permissionMode: "allow-once",
  optionsMode: "full",
});
const allowAlways = await runCase({
  sessionName: "perm-allow-always",
  permissionMode: "allow-always",
  optionsMode: "full",
});
const rejectOnce = await runCase({
  sessionName: "perm-reject-once",
  permissionMode: "reject-once",
  optionsMode: "full",
});
const failNoOption = await runCase({
  sessionName: "perm-fail-no-option",
  permissionMode: "fail",
  optionsMode: "allow-only",
});

const ok =
  allowOnce.code === 0 && allowOnce.hasDone && !allowOnce.hasError &&
  allowAlways.code === 0 && allowAlways.hasDone && !allowAlways.hasError &&
  rejectOnce.code !== 0 && rejectOnce.hasError &&
  failNoOption.code !== 0 && failNoOption.hasError;

if (ok) {
  console.log("ok integration bridge-permission-modes");
  process.exit(0);
}

console.error("FAIL bridge-permission-modes", { allowOnce, allowAlways, rejectOnce, failNoOption });
process.exit(1);

