import { spawn } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const tests = [
  "test/argv.test.js",
  "test/map-events.test.js",
  "test/store.test.js",
  "test/integration/bridge-prompt.test.js",
  "test/wrapper.test.js",
];

let failed = 0;
for (const t of tests) {
  const p = spawn("node", [join(root, t)], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  const code = await new Promise((resolve) => p.on("close", resolve));
  if (code !== 0) failed++;
}
process.exit(failed > 0 ? 1 : 0);
