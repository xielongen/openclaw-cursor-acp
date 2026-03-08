#!/usr/bin/env bash
# OPENCLAW_META
# TASK_NAME=cursor-acp-bind
# PURPOSE=维护 Feishu scope 到 Cursor ACP sessionKey 的持久绑定
# LOGIC=精确逻辑(JSON 持久化+文件锁+会话有效性校验)
# TAGS=acp,cursor,feishu,session,binding
# END OPENCLAW_META
set -euo pipefail

ACTION="${1:-help}"
shift || true

BINDINGS_FILE="${OPENCLAW_CURSOR_ACP_BINDINGS_FILE:-$HOME/.openclaw/workspace/memory/acp/cursor-scope-bindings.json}"
LOCK_FILE="${OPENCLAW_CURSOR_ACP_BINDINGS_LOCK:-/tmp/openclaw-cursor-acp-bind.lock}"
CURSOR_STORE_FILE="${OPENCLAW_CURSOR_ACP_SESSION_STORE:-$HOME/.openclaw/agents/cursor/sessions/sessions.json}"

mkdir -p "$(dirname "$BINDINGS_FILE")"
touch "$LOCK_FILE"
exec 9>"$LOCK_FILE"
flock -x 9

if [[ ! -f "$BINDINGS_FILE" ]]; then
  printf '{}' > "$BINDINGS_FILE"
fi

SCOPE=""
SESSION_KEY=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --scope)
      SCOPE="${2:-}"
      shift 2
      ;;
    --session-key)
      SESSION_KEY="${2:-}"
      shift 2
      ;;
    *)
      echo "unknown arg: $1" >&2
      exit 2
      ;;
  esac
done

require_scope() {
  if [[ -z "$SCOPE" ]]; then
    echo "missing --scope" >&2
    exit 2
  fi
}

is_session_valid() {
  local key="$1"
  [[ -n "$key" ]] || return 1
  [[ -f "$CURSOR_STORE_FILE" ]] || return 1
  python3 - "$CURSOR_STORE_FILE" "$key" <<'PY'
import json,sys
store_path, key = sys.argv[1], sys.argv[2]
try:
    with open(store_path, "r", encoding="utf-8") as f:
        data = json.load(f)
except Exception:
    raise SystemExit(1)
entry = data.get(key)
if not isinstance(entry, dict):
    raise SystemExit(1)
acp = entry.get("acp") if isinstance(entry.get("acp"), dict) else {}
backend = acp.get("backend")
state = acp.get("identity", {}).get("state")
if backend == "acpx" and state in ("pending", "resolved"):
    raise SystemExit(0)
raise SystemExit(1)
PY
}

cmd_get() {
  require_scope
  python3 - "$BINDINGS_FILE" "$SCOPE" <<'PY'
import json,sys
path, scope = sys.argv[1], sys.argv[2]
with open(path, "r", encoding="utf-8") as f:
    data = json.load(f)
row = data.get(scope) or {}
print(row.get("sessionKey", ""))
PY
}

cmd_set() {
  require_scope
  if [[ -z "$SESSION_KEY" ]]; then
    echo "missing --session-key" >&2
    exit 2
  fi
  python3 - "$BINDINGS_FILE" "$SCOPE" "$SESSION_KEY" <<'PY'
import json,sys,time
path, scope, session_key = sys.argv[1], sys.argv[2], sys.argv[3]
with open(path, "r", encoding="utf-8") as f:
    data = json.load(f)
now = int(time.time() * 1000)
data[scope] = {
    "sessionKey": session_key,
    "updatedAt": now,
    "lastUsedAt": now
}
with open(path, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
print(session_key)
PY
}

cmd_touch() {
  require_scope
  python3 - "$BINDINGS_FILE" "$SCOPE" <<'PY'
import json,sys,time
path, scope = sys.argv[1], sys.argv[2]
with open(path, "r", encoding="utf-8") as f:
    data = json.load(f)
row = data.get(scope)
if isinstance(row, dict):
    row["lastUsedAt"] = int(time.time() * 1000)
    data[scope] = row
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
PY
}

cmd_clear() {
  require_scope
  python3 - "$BINDINGS_FILE" "$SCOPE" <<'PY'
import json,sys
path, scope = sys.argv[1], sys.argv[2]
with open(path, "r", encoding="utf-8") as f:
    data = json.load(f)
data.pop(scope, None)
with open(path, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
print("cleared")
PY
}

cmd_list() {
  python3 - "$BINDINGS_FILE" <<'PY'
import json,sys
path = sys.argv[1]
with open(path, "r", encoding="utf-8") as f:
    data = json.load(f)
print(json.dumps(data, ensure_ascii=False, indent=2))
PY
}

cmd_resolve() {
  require_scope
  local key
  key="$(cmd_get)"
  if [[ -n "$key" ]] && is_session_valid "$key"; then
    cmd_touch
    echo "$key"
    return 0
  fi
  if [[ -n "$key" ]]; then
    cmd_clear >/dev/null
  fi
  echo ""
}

case "$ACTION" in
  get) cmd_get ;;
  set) cmd_set ;;
  touch) cmd_touch ;;
  clear) cmd_clear ;;
  list) cmd_list ;;
  resolve) cmd_resolve ;;
  help|*)
    cat <<'EOF'
Usage:
  cursor-acp-bind.sh resolve --scope <scopeKey>
  cursor-acp-bind.sh get --scope <scopeKey>
  cursor-acp-bind.sh set --scope <scopeKey> --session-key <agent:cursor:acp:...>
  cursor-acp-bind.sh touch --scope <scopeKey>
  cursor-acp-bind.sh clear --scope <scopeKey>
  cursor-acp-bind.sh list

Env overrides:
  OPENCLAW_CURSOR_ACP_BINDINGS_FILE
  OPENCLAW_CURSOR_ACP_BINDINGS_LOCK
  OPENCLAW_CURSOR_ACP_SESSION_STORE
EOF
    ;;
esac
