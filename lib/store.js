import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { dirname, join } from "path";
import { tmpdir } from "os";

const HOME_DIR = process.env.HOME || process.env.USERPROFILE || tmpdir();
const LEGACY_FILE = join(HOME_DIR, ".acp2acpx", "sessions.json");
const DEFAULT_FILE = (() => {
  const preferred = process.env.OPENCLAW_CURSOR_ACP_SESSIONS_FILE?.trim();
  if (preferred) return preferred;
  const legacyEnv = process.env.ACP2ACPX_SESSIONS_FILE?.trim();
  if (legacyEnv) return legacyEnv;
  const modernDefault = join(HOME_DIR, ".openclaw-cursor-acp", "sessions.json");
  // Backward compatibility: keep using legacy store if it already exists.
  if (existsSync(LEGACY_FILE) && !existsSync(modernDefault)) return LEGACY_FILE;
  return modernDefault;
})();

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
