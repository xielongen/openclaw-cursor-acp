#!/usr/bin/env node
import { parseArgv } from "../lib/argv.js";
import { createStore } from "../lib/store.js";
import * as ensureCmd from "../lib/commands/ensure.js";
import * as promptCmd from "../lib/commands/prompt.js";
import * as statusCmd from "../lib/commands/status.js";
import * as cancelCmd from "../lib/commands/cancel.js";
import * as closeCmd from "../lib/commands/close.js";
import * as setModeCmd from "../lib/commands/set-mode.js";

const argv = process.argv.slice(2);
const parsed = parseArgv(argv);

if (parsed.agent !== "cursor") {
  process.stderr.write("openclaw-cursor-acp bridge: expected agent cursor\n");
  process.exit(2);
}

const store = createStore();
const opts = {
  cwd: parsed.cwd,
  sessionName: parsed.sessionName,
  name: parsed.name,
  store,
  rest: parsed.rest,
  subcommand: parsed.subcommand,
  subcommandDetail: parsed.subcommandDetail,
};

async function main() {
  if (parsed.subcommand === "sessions" && parsed.subcommandDetail === "ensure") {
    await ensureCmd.run(opts);
    process.exit(0);
  }
  if (parsed.subcommand === "sessions" && parsed.subcommandDetail === "close") {
    await closeCmd.run(opts);
    process.exit(0);
  }
  if (parsed.subcommand === "prompt") {
    await promptCmd.run(opts);
    process.exit(0);
  }
  if (parsed.subcommand === "status") {
    await statusCmd.run(opts);
    process.exit(0);
  }
  if (parsed.subcommand === "cancel") {
    await cancelCmd.run(opts);
    process.exit(0);
  }
  if (parsed.subcommand === "set-mode" || parsed.subcommand === "set") {
    await setModeCmd.run(opts);
    process.exit(0);
  }

  process.stderr.write("openclaw-cursor-acp bridge: unknown subcommand " + String(parsed.subcommand) + "\n");
  process.stdout.write(JSON.stringify({ type: "error", code: "USAGE", message: "unknown command" }) + "\n");
  process.exit(2);
}

main().catch((err) => {
  process.stderr.write(String(err) + "\n");
  process.stdout.write(JSON.stringify({ type: "error", message: err.message || String(err) }) + "\n");
  process.exit(1);
});
