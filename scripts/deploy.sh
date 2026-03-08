#!/usr/bin/env bash
# Deploy openclaw-cursor-acp: replace OpenClaw acpx plugin binary with wrapper.
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="$PROJECT_DIR/deploy-backup"
OPENCLAW_ACPX_BIN=""

# Resolve openclaw's acpx plugin path (same logic as plugin: extensions/acpx/node_modules/.bin/acpx)
find_openclaw_acpx_bin() {
  if [ -n "$OPENCLAW_ACPX_BIN" ] && [ -e "$OPENCLAW_ACPX_BIN" ]; then
    return
  fi
  # Prefer env
  if [ -n "$OPENCLAW_ACPX_BIN" ]; then
    return
  fi
  # Try require from global node
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
  if [ -n "$node_path" ] && [ -e "$node_path" ]; then
    OPENCLAW_ACPX_BIN="$node_path"
    return
  fi
  # Fallback: common global install paths
  for base in "$HOME/.nvm/versions/node/"*/lib/node_modules/openclaw \
              /usr/lib/node_modules/openclaw; do
    [ -d "$base" ] || continue
    if [ -f "$base/extensions/acpx/node_modules/.bin/acpx" ] || [ -L "$base/extensions/acpx/node_modules/.bin/acpx" ]; then
      OPENCLAW_ACPX_BIN="$base/extensions/acpx/node_modules/.bin/acpx"
      return
    fi
  done
}

echo "== openclaw-cursor-acp deploy =="
find_openclaw_acpx_bin
if [ -z "$OPENCLAW_ACPX_BIN" ]; then
  echo "Error: could not find openclaw acpx binary (run from a dir where openclaw is resolvable, or set OPENCLAW_ACPX_BIN)."
  exit 1
fi
echo "Target acpx: $OPENCLAW_ACPX_BIN"

PLUGIN_BIN_DIR="$(dirname "$OPENCLAW_ACPX_BIN")"
mkdir -p "$BACKUP_DIR"

# Backup: save symlink target so we can restore
if [ -L "$OPENCLAW_ACPX_BIN" ]; then
  ln_target=$(readlink "$OPENCLAW_ACPX_BIN")
  echo "$ln_target" > "$BACKUP_DIR/acpx.symlink.target"
  real_path=$(readlink -f "$OPENCLAW_ACPX_BIN" 2>/dev/null || realpath "$OPENCLAW_ACPX_BIN" 2>/dev/null || echo "")
  [ -n "$real_path" ] && echo "$real_path" > "$BACKUP_DIR/acpx.realpath"
  echo "Backed up symlink target: $ln_target"
elif [ -f "$OPENCLAW_ACPX_BIN" ]; then
  cp -a "$OPENCLAW_ACPX_BIN" "$BACKUP_DIR/acpx.original"
  echo "Backed up binary to $BACKUP_DIR/acpx.original"
fi

# Real acpx path for ACPX_REAL (for non-cursor agents)
REAL_ACPX="${OPENCLAW_ACPX_BIN}"
if [ -L "$OPENCLAW_ACPX_BIN" ] && [ -f "$BACKUP_DIR/acpx.realpath" ]; then
  REAL_ACPX=$(cat "$BACKUP_DIR/acpx.realpath")
fi

# Replace with wrapper invoker
WRAPPER="$PROJECT_DIR/bin/acpx-wrapper"
if [ ! -f "$WRAPPER" ]; then
  echo "Error: wrapper not found: $WRAPPER"
  exit 1
fi
rm -f "$OPENCLAW_ACPX_BIN"
cat > "$OPENCLAW_ACPX_BIN" << DEPLOY_SCRIPT
#!/usr/bin/env bash
exec env ACPX_REAL="$REAL_ACPX" "$WRAPPER" "\$@"
DEPLOY_SCRIPT
chmod +x "$OPENCLAW_ACPX_BIN"
echo "Replaced with wrapper (ACPX_REAL=$REAL_ACPX)."
echo "Done. Rollback: run scripts/rollback.sh"
exit 0
