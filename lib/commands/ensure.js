/**
 * sessions ensure --name <name>: output acpx session_ensured line without calling Cursor.
 * @param {{ sessionName: string, name: string, cwd: string, store: import('../store.js').ReturnType<import('../store.js').createStore> }} opts
 */
export async function run(opts) {
  const name = opts.name || opts.sessionName || (opts.rest && opts.rest[0]) || "default";
  const line = JSON.stringify({
    type: "session_ensured",
    acpxRecordId: "rec-" + name,
    acpxSessionId: "sid-" + name,
    agentSessionId: "inner-" + name,
    name,
    created: true,
  });
  process.stdout.write(line + "\n");
}
