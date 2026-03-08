/**
 * set-mode <mode> --session <name> / set <key> <value> --session <name>:
 * apply controls to the real Cursor ACP session (if mapped), not no-op.
 */
import { createAcpClient } from "../acp-client.js";

export async function run(opts) {
  const { sessionName, rest, store, cwd } = opts;
  const name = sessionName || opts.name;
  const subcommand = opts.subcommand;
  const entry = name ? store.get(name) : null;
  const cursorSessionId = entry?.cursorSessionId;

  if (!name || !cursorSessionId) {
    process.stdout.write(JSON.stringify({
      type: "error",
      code: "NO_SESSION",
      message: "no mapped Cursor session for this name; run prompt first",
    }) + "\n");
    process.exit(1);
  }

  const client = createAcpClient(cwd, process.env);
  try {
    if (subcommand === "set-mode") {
      const mode = (rest[0] || "agent").trim();
      await client.sessionSetMode(cursorSessionId, mode, cwd);
      process.stdout.write(JSON.stringify({
        type: "mode_set",
        acpxSessionId: "sid-" + name,
        mode,
      }) + "\n");
      return;
    }

    const key = (rest[0] || "").trim();
    const value = (rest[1] || "").trim();
    if (!key || !value) {
      process.stdout.write(JSON.stringify({
        type: "error",
        code: "INVALID_ARGS",
        message: "set requires key and value",
      }) + "\n");
      process.exit(1);
    }
    await client.sessionSetConfigOption(cursorSessionId, key, value, cwd);
    process.stdout.write(JSON.stringify({
      type: "config_set",
      acpxSessionId: "sid-" + name,
      key,
      value,
    }) + "\n");
  } catch (err) {
    process.stdout.write(JSON.stringify({
      type: "error",
      code: "ACP_CONTROL_FAILED",
      message: err instanceof Error ? err.message : String(err),
    }) + "\n");
    process.exit(1);
  } finally {
    client.close();
  }
}
