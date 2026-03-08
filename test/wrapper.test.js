/**
 * Wrapper test: run acpx-wrapper with cursor sessions ensure; expect bridge output (session_ensured).
 */
import { spawn } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");
const wrapperPath = join(projectRoot, "bin/acpx-wrapper");

const child = spawn("bash", [wrapperPath, "--format", "json", "--json-strict", "--cwd", projectRoot, "cursor", "sessions", "ensure", "--name", "wrappertest"], {
  cwd: projectRoot,
  env: { ...process.env, ACPX_REAL: "/nonexistent-acpx-so-bridge-runs" },
  stdio: ["pipe", "pipe", "pipe"],
});

let stdout = "";
child.stdout.on("data", (c) => { stdout += c; });
child.on("close", (code) => {
  const line = stdout.split(/\r?\n/)[0];
  let ok = false;
  try {
    const o = JSON.parse(line);
    ok = (o.type === "session_ensured" || o.acpxRecordId) && code === 0;
  } catch (_) { }
  if (ok) {
    console.log("ok wrapper cursor ensure");
    process.exit(0);
  } else {
    console.error("FAIL wrapper: code=" + code + " stdout=" + stdout.slice(0, 200));
    process.exit(1);
  }
});
