import { mkdtempSync, rmSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { createStore } from "../lib/store.js";

const dir = mkdtempSync(join(tmpdir(), "openclaw-cursor-acp-store-test-"));
const filePath = join(dir, "sessions.json");

(async () => {
  try {
    const store = createStore(filePath);
    const m1 = store.load();
    if (Object.keys(m1).length !== 0) throw new Error("empty store should load as {}");
    await store.set("s1", { cursorSessionId: "cursor-uuid-1" });
    const m2 = store.load();
    if (m2.s1?.cursorSessionId !== "cursor-uuid-1") throw new Error("after set, get s1");
    const g = store.get("s1");
    if (!g || g.cursorSessionId !== "cursor-uuid-1") throw new Error("get(s1)");
    await store.delete("s1");
    const m3 = store.load();
    if (m3.s1 != null) throw new Error("after delete s1 should be gone");
    const g2 = store.get("s1");
    if (g2 !== null) throw new Error("get(s1) after delete should be null");
    console.log("ok store tests");
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    try { rmSync(dir, { recursive: true, force: true }); } catch (_) { }
  }
})();
