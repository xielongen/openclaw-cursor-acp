/**
 * sessions close [name]: output acpx session_closed line and remove from store.
 */
export async function run(opts) {
  const { sessionName, store, name: nameOpt, rest } = opts;
  const name = nameOpt || sessionName || (Array.isArray(rest) && rest[0] ? rest[0] : null);
  if (name) await store.delete(name);
  const line = JSON.stringify({
    type: "session_closed",
    acpxRecordId: name ? "rec-" + name : null,
    acpxSessionId: name ? "sid-" + name : null,
    name: name || null,
  });
  process.stdout.write(line + "\n");
}
