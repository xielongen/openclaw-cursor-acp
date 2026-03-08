/**
 * status --session <name>: output acpx status line from store.
 */
export async function run(opts) {
  const { sessionName, store } = opts;
  const name = sessionName || opts.name;
  const entry = name ? store.get(name) : null;
  const line = entry
    ? JSON.stringify({
      acpxRecordId: "rec-" + name,
      acpxSessionId: "sid-" + name,
      agentSessionId: entry.cursorSessionId || "inner-" + name,
      status: "alive",
      pid: process.pid,
      uptime: 0,
    })
    : JSON.stringify({
      acpxRecordId: null,
      acpxSessionId: null,
      agentSessionId: null,
      status: "no-session",
      pid: process.pid,
      uptime: 0,
    });
  process.stdout.write(line + "\n");
}
