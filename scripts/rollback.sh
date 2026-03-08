#!/usr/bin/env bash
# Rollback acp2acpx: restore OpenClaw acpx plugin's original binary.
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="$PROJECT_DIR/deploy-backup"
OPENCLAW_ACPX_BIN=""

find_openclaw_acpx_bin() {
  if [ -n "$OPENCLAW_ACPX_BIN" ] && [ -e "$OPENCLAW_ACPX_BIN" ]; then
    return
  fi
  local node_path
  node_path=$(node -e "
    try {
      const p = require('path');
      const entry = require.resolve('openclaw/package.json', { paths: [process.execPath + '/../../lib/node_modules'] });
      const root = p.dirname(entry);
      const bin = p.join(root, 'extensions', 'acpx', 'node_modules', '.bin', 'acpx');
      console.log(bin);
    } catch (e) {
      process.exit(1);
    }
  " 2>/dev/null) || true
  if [ -n "$node_path" ]; then
    OPENCLAW_ACPX_BIN="$node_path"
    return
  fi
  for base in "$HOME/.nvm/versions/node/"*/lib/node_modules/openclaw \
              /usr/lib/node_modules/openclaw; do
    [ -d "$base" ] || continue
    if [ -e "$base/extensions/acpx/node_modules/.bin/acpx" ]; then
      OPENCLAW_ACPX_BIN="$base/extensions/acpx/node_modules/.bin/acpx"
      return
    fi
  done
}

echo "== acp2acpx rollback =="
find_openclaw_acpx_bin
if [ -z "$OPENCLAW_ACPX_BIN" ]; then
  echo "Error: could not find openclaw acpx path. Set OPENCLAW_ACPX_BIN to the plugin .bin/acpx path."
  exit 1
fi
if [ ! -d "$BACKUP_DIR" ]; then
  echo "Error: no backup dir $BACKUP_DIR (nothing to restore)."
  exit 1
fi

PLUGIN_BIN_DIR="$(dirname "$OPENCLAW_ACPX_BIN")"
rm -f "$OPENCLAW_ACPX_BIN"

if [ -f "$BACKUP_DIR/acpx.symlink.target" ]; then
  ln -s "$(cat "$BACKUP_DIR/acpx.symlink.target")" "$OPENCLAW_ACPX_BIN"
  echo "Restored symlink to $(cat "$BACKUP_DIR/acpx.symlink.target")."
elif [ -f "$BACKUP_DIR/acpx.original" ]; then
  cp -a "$BACKUP_DIR/acpx.original" "$OPENCLAW_ACPX_BIN"
  echo "Restored binary from backup."
else
  echo "Error: no acpx.symlink.target or acpx.original in $BACKUP_DIR"
  exit 1
fi
echo "Rollback done."
exit 0
