/**
 * set-mode <mode> --session <name> / set <key> <value> --session <name>: no-op for Cursor, output compatible line.
 */
export async function run(opts) {
  const { sessionName, rest } = opts;
  const name = sessionName || opts.name;
  const subcommand = opts.subcommand;
  if (subcommand === "set-mode") {
    const mode = rest[0];
    process.stdout.write(JSON.stringify({ type: "mode_set", acpxSessionId: name ? "sid-" + name : null, mode: mode || "agent" }) + "\n");
  } else {
    const key = rest[0];
    const value = rest[1];
    process.stdout.write(JSON.stringify({ type: "config_set", acpxSessionId: name ? "sid-" + name : null, key: key || "", value: value || "" }) + "\n");
  }
}
