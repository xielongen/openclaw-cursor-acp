#!/usr/bin/env bash
# Uninstall openclaw-cursor-acp from local OpenClaw acpx plugin.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "== openclaw-cursor-acp uninstall =="
bash "$PROJECT_DIR/scripts/rollback.sh"
echo "Uninstall complete (rolled back to original acpx binary)."
