# Contributing

## Local setup

```bash
cd /path/to/openclaw-cursor-acp
npm test
```

## Rules

- Keep all behavior changes covered by tests.
- Prefer small focused commits.
- Do not remove deploy backup/rollback behavior.
- Keep compatibility with OpenClaw acpx command surface.

## Before opening PR

1. `npm test` passes
2. `README.md` and `CHANGELOG.md` updated when needed
3. Manual smoke test done on real Cursor ACP path
