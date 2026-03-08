/**
 * cancel --session <name>: output acpx cancel line and remove from store.
 */
export async function run(opts) {
  const { sessionName, store } = opts;
  const name = sessionName || opts.name;
  if (name) await store.delete(name);
  const line = JSON.stringify({
    acpxSessionId: name ? "sid-" + name : null,
    cancelled: true,
  });
  process.stdout.write(line + "\n");
}
