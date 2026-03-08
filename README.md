# openclaw-cursor-acp

Use Cursor as an ACP coding backend in OpenClaw, without changing OpenClaw core.

`openclaw-cursor-acp` provides:
- a wrapper (`bin/acpx-wrapper`) that intercepts only `cursor` requests
- a bridge (`bin/bridge.js`) that maps OpenClaw acpx-style commands to standard ACP (`agent acp`)
- session persistence (`sessionName -> cursorSessionId`) for multi-turn runs

## Why this exists

OpenClaw's ACP runtime talks to an `acpx` command with acpx-style CLI/event semantics.
Cursor exposes standard ACP (`agent acp`) over JSON-RPC.
This project bridges those two worlds.

## Prerequisites

- Linux/macOS
- Node.js >= 18
- OpenClaw installed and running
- Cursor CLI available with ACP support (`agent acp`)

## Quick Start (recommended)

```bash
cd /path/to/openclaw-cursor-acp
npm test
npm run install:openclaw
```

This will:
1. run all tests
2. replace OpenClaw plugin `acpx` entry with wrapper (with backup)
3. keep non-cursor agents routed to original acpx

## Uninstall / Rollback

```bash
cd /path/to/openclaw-cursor-acp
npm run uninstall:openclaw
```

## Usage

### In OpenClaw

Use `sessions_spawn` with:
- `runtime: "acp"`
- `agentId: "cursor"`

For Feishu/non-thread contexts, use `mode: "run"`.

### Direct CLI smoke test

```bash
echo "在当前目录创建 hello.txt，内容 Hello ACP" | \
./bin/acpx-wrapper \
  --format json --json-strict --cwd /tmp cursor prompt --session smoke --file -
```

Expected: NDJSON output with `type: "text"` and final `type: "done"`.

## Project Structure

- `bin/acpx-wrapper`: dispatch by agent id (`cursor` -> bridge; others -> real acpx)
- `bin/bridge.js`: acpx-like command dispatcher for Cursor
- `lib/acp-client.js`: JSON-RPC ACP client for Cursor `agent acp`
- `lib/map-events.js`: ACP update -> acpx event mapping
- `scripts/deploy.sh`: install wrapper into OpenClaw plugin path
- `scripts/rollback.sh`: restore original OpenClaw acpx entry

## Testing

```bash
npm test
```

Includes:
- argv parser tests
- mapping tests
- store tests
- wrapper behavior tests
- integration test with mock ACP server

## CI

GitHub Actions workflow is included under `.github/workflows/ci.yml`.

## Release Checklist

1. `npm test` passes
2. manual smoke test on real Cursor ACP
3. update `CHANGELOG.md`
4. tag release (for example `v0.1.0`)

## License

MIT
