import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { dirname, join } from "path";
import { tmpdir } from "os";

const DEFAULT_FILE = process.env.ACP2ACPX_SESSIONS_FILE ||
  join(process.env.HOME || process.env.USERPROFILE || tmpdir(), ".acp2acpx", "sessions.json");

/**
 * @param {string} [filePath]
 * @returns {{ load: () => Record<string,{ cursorSessionId: string }>, save: (map: Record<string,{ cursorSessionId: string }>) => Promise<void>, get: (name: string) => { cursorSessionId: string } | null, set: (name: string, data: { cursorSessionId: string }) => Promise<void>, delete: (name: string) => Promise<void> }}
 */
export function createStore(filePath = DEFAULT_FILE) {
  function load() {
    try {
      const raw = readFileSync(filePath, "utf8");
      const data = JSON.parse(raw);
      return typeof data === "object" && data !== null ? data : {};
    } catch (e) {
      if (e && e.code === "ENOENT") return {};
      throw e;
    }
  }

  async function save(map) {
    const dir = dirname(filePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const tmp = join(dir, `.sessions.${process.pid}.${Date.now()}.tmp`);
    writeFileSync(tmp, JSON.stringify(map, null, 0), "utf8");
    const { renameSync } = await import("fs");
    renameSync(tmp, filePath);
  }

  function get(name) {
    const map = load();
    return map[name] ?? null;
  }

  async function set(name, data) {
    const map = load();
    map[name] = data;
    await save(map);
  }

  async function remove(name) {
    const map = load();
    delete map[name];
    await save(map);
  }

  return { load, save, get, set, delete: remove };
}
