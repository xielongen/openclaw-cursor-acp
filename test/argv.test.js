import { parseArgv } from "../lib/argv.js";

const tests = [
  {
    name: "cursor sessions ensure --name X",
    argv: ["--format", "json", "--json-strict", "--cwd", "/tmp", "cursor", "sessions", "ensure", "--name", "agent:cursor:acp:123"],
    expect: { cwd: "/tmp", agent: "cursor", subcommand: "sessions", subcommandDetail: "ensure", sessionName: null, name: "agent:cursor:acp:123" },
  },
  {
    name: "cursor prompt --session X --file -",
    argv: ["--format", "json", "--cwd", "/home/proj", "cursor", "prompt", "--session", "agent:cursor:acp:456", "--file", "-"],
    expect: { cwd: "/home/proj", agent: "cursor", subcommand: "prompt", subcommandDetail: null, sessionName: "agent:cursor:acp:456", name: null },
  },
  {
    name: "codex sessions ensure --name X",
    argv: ["--format", "json", "--cwd", "/tmp", "codex", "sessions", "ensure", "--name", "agent:codex:acp:1"],
    expect: { cwd: "/tmp", agent: "codex", subcommand: "sessions", subcommandDetail: "ensure", sessionName: null, name: "agent:codex:acp:1" },
  },
  {
    name: "cursor status --session X",
    argv: ["--format", "json", "--cwd", "/x", "cursor", "status", "--session", "s1"],
    expect: { cwd: "/x", agent: "cursor", subcommand: "status", subcommandDetail: null, sessionName: "s1", name: null },
  },
  {
    name: "cursor cancel --session X",
    argv: ["--cwd", "/y", "cursor", "cancel", "--session", "s2"],
    expect: { cwd: "/y", agent: "cursor", subcommand: "cancel", subcommandDetail: null, sessionName: "s2", name: null },
  },
];

let passed = 0;
let failed = 0;
for (const t of tests) {
  const out = parseArgv(t.argv);
  const ok =
    out.cwd === t.expect.cwd &&
    out.agent === t.expect.agent &&
    out.subcommand === t.expect.subcommand &&
    out.subcommandDetail === t.expect.subcommandDetail &&
    out.sessionName === t.expect.sessionName &&
    out.name === t.expect.name;
  if (ok) {
    passed++;
    console.log("ok argv " + t.name);
  } else {
    failed++;
    console.error("FAIL argv " + t.name);
    console.error("  expected", t.expect);
    console.error("  got     ", { cwd: out.cwd, agent: out.agent, subcommand: out.subcommand, subcommandDetail: out.subcommandDetail, sessionName: out.sessionName, name: out.name });
  }
}
console.log("argv tests: " + passed + " passed, " + failed + " failed");
process.exit(failed > 0 ? 1 : 0);
