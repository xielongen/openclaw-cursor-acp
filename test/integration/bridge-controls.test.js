/**
 * Integration: verify set-mode and set-config are forwarded to ACP backend.
 */
import { spawnSync } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "../..");
const bridgePath = join(projectRoot, "bin/bridge.js");
const fakeAgentPath = join(projectRoot, "test/fake-agent.js");
const tempDir = mkdtempSync(join(tmpdir(), "openclaw-cursor-acp-controls-"));
const sessionsFile = join(tempDir, "sessions.json");

try {
  // preseed session mapping
  writeFileSync(
    sessionsFile,
    JSON.stringify({
      "controls-session": { cursorSessionId: "mock-session-control-1" },
    }),
    "utf8",
  );

  const baseEnv = {
    ...process.env,
    ACP_AGENT_BIN: fakeAgentPath,
    OPENCLAW_CURSOR_ACP_SESSIONS_FILE: sessionsFile,
  };

  const run = (args) =>
    spawnSync("node", [bridgePath, ...args], {
      cwd: projectRoot,
      env: baseEnv,
      encoding: "utf8",
    });

  const modeRes = run([
    "--format", "json", "--json-strict", "--cwd", projectRoot,
    "cursor", "set-mode", "ask", "--session", "controls-session",
  ]);
  if (modeRes.status !== 0) {
    console.error("FAIL bridge-controls set-mode exit", modeRes.status, modeRes.stdout, modeRes.stderr);
    process.exit(1);
  }
  const modeLine = modeRes.stdout.split(/\r?\n/).filter(Boolean).pop();
  const modeObj = JSON.parse(modeLine);
  if (modeObj.type !== "mode_set" || modeObj.mode !== "ask") {
    console.error("FAIL bridge-controls set-mode payload", modeObj);
    process.exit(1);
  }

  const setRes = run([
    "--format", "json", "--json-strict", "--cwd", projectRoot,
    "cursor", "set", "verbosity", "high", "--session", "controls-session",
  ]);
  if (setRes.status !== 0) {
    console.error("FAIL bridge-controls set exit", setRes.status, setRes.stdout, setRes.stderr);
    process.exit(1);
  }
  const setLine = setRes.stdout.split(/\r?\n/).filter(Boolean).pop();
  const setObj = JSON.parse(setLine);
  if (setObj.type !== "config_set" || setObj.key !== "verbosity" || setObj.value !== "high") {
    console.error("FAIL bridge-controls set payload", setObj);
    process.exit(1);
  }

  console.log("ok integration bridge-controls");
  process.exit(0);
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

