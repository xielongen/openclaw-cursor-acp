#!/usr/bin/env bash
# Install openclaw-cursor-acp into local OpenClaw acpx plugin.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "== openclaw-cursor-acp install =="
echo "Project: $PROJECT_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "Error: node is required."
  exit 1
fi

if ! command -v openclaw >/dev/null 2>&1; then
  echo "Error: openclaw CLI not found on PATH."
  exit 1
fi

echo "1) Running tests..."
cd "$PROJECT_DIR"
npm test

echo "2) Deploying wrapper into OpenClaw acpx plugin..."
bash "$PROJECT_DIR/scripts/deploy.sh"

echo "3) Verifying wrapper entry..."
ACPX_BIN="$(node -e "
  const p=require('path');
  const entry=require.resolve('openclaw/package.json',{paths:[process.execPath+'/../../lib/node_modules']});
  process.stdout.write(p.join(p.dirname(entry),'extensions','acpx','node_modules','.bin','acpx'));
")"
python3 - "$ACPX_BIN" <<'PY'
import sys
from pathlib import Path
p = Path(sys.argv[1])
text = p.read_text(encoding='utf-8', errors='ignore')
print('wrapper_installed=', 'acpx-wrapper' in text)
if 'acpx-wrapper' not in text:
    raise SystemExit(1)
PY

echo "Install complete."
