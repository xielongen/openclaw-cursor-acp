/**
 * Parse process.argv into cwd, agent, subcommand, sessionName, etc.
 * Matches OpenClaw acpx plugin: --format json --json-strict --cwd <cwd> [flags] <agent> <subcommand> [--session X] [--name Y] ...
 */
const FLAGS_WITH_VALUE = new Set([
  "--format",
  "--cwd",
  "--timeout",
  "--ttl",
  "--non-interactive-permissions",
  "--session",
  "--name",
  "--file",
]);

/**
 * @param {string[]} argv - e.g. process.argv.slice(2)
 * @returns {{ cwd: string, agent: string | null, subcommand: string | null, subcommandDetail: string | null, sessionName: string | null, name: string | null, rest: string[] }}
 */
export function parseArgv(argv) {
  const rest = [];
  let cwd = process.cwd();
  let sessionName = null;
  let name = null;
  let agent = null;
  let subcommand = null;
  let subcommandDetail = null;

  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    if (FLAGS_WITH_VALUE.has(arg)) {
      const value = argv[i + 1];
      if (arg === "--cwd" && value !== undefined) cwd = value;
      else if (arg === "--session" && value !== undefined) sessionName = value;
      else if (arg === "--name" && value !== undefined) name = value;
      i += 2;
      continue;
    }
    if (arg.startsWith("-")) {
      i += 1;
      continue;
    }
    if (agent === null) {
      agent = arg;
      i += 1;
      continue;
    }
    if (subcommand === null) {
      subcommand = arg;
      if (arg === "sessions") {
        const next = argv[i + 1];
        if (next === "ensure" || next === "close") {
          subcommandDetail = next;
          i += 1;
        }
      }
      i += 1;
      continue;
    }
    if (subcommand === "sessions" && subcommandDetail === "close" && name === null && argv[i - 1] !== "close") {
      // sessions close <name>: name can be positional
      name = arg;
      i += 1;
      continue;
    }
    rest.push(arg);
    i += 1;
  }

  return { cwd, agent, subcommand, subcommandDetail, sessionName, name, rest };
}
