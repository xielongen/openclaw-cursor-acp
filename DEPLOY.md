# openclaw-cursor-acp 部署与回退

## 已做备份

- **openclaw.json**：备份在 `workspace/backups/openclaw.json.bak.pre-openclaw-cursor-acp-YYYYMMDD-HHMMSS`，部署前已复制一份。
- **acpx 二进制**：部署时在 `workspace/projects/openclaw-cursor-acp/deploy-backup/` 保存了插件原 `.bin/acpx` 的符号链接目标（`acpx.symlink.target`）和真实路径（`acpx.realpath`），用于回退时恢复。

## 部署步骤（已完成可略过）

1. **备份 openclaw.json**（若尚未备份）
   ```bash
   cp ~/.openclaw/openclaw.json ~/workspace/backups/openclaw.json.bak.pre-openclaw-cursor-acp-$(date +%Y%m%d-%H%M%S)
   ```

2. **确保插件目录有 acpx**
   在 openclaw 的 acpx 插件目录执行：
   `npm install --omit=dev --no-save acpx@0.1.13`
   （若已安装可跳过。）

3. **执行部署脚本**
   ```bash
   cd /path/to/openclaw-cursor-acp && ./scripts/deploy.sh
   ```
   脚本会：把插件内的 `extensions/acpx/node_modules/.bin/acpx` 替换为调用本仓库 `bin/acpx-wrapper` 的脚本，并设 `ACPX_REAL` 为原 acpx（非 cursor 请求仍走原 acpx）。

4. **配置 openclaw 允许 Cursor**
   在 `openclaw.json` 中已有（或添加）：
   ```json
   "acp": {
     "enabled": true,
     "allowedAgents": ["codex", "claudecode", "gemini", "cursor"],
     "defaultAgent": "codex"
   }
   ```

## 回退步骤

### 恢复 acpx 二进制

在 openclaw-cursor-acp 项目目录执行：

```bash
cd /path/to/openclaw-cursor-acp && ./scripts/rollback.sh
```

会从 `deploy-backup/` 恢复插件原来的 `.bin/acpx`（符号链接或备份文件）。

### 恢复 openclaw.json（若曾改过）

```bash
cp ~/workspace/backups/openclaw.json.bak.pre-openclaw-cursor-acp-<timestamp> ~/.openclaw/openclaw.json
```

用你要回退的那份备份文件名替换 `<timestamp>`。

## 真实使用

详见 **USAGE.md**。简要说明：

- **渠道里用**：在飞书/Telegram 等对 OpenClaw 说「用 Cursor 在某某目录做 xxx」，主 agent 会调用 `sessions_spawn` 且 `agentId: "cursor"`，请求会经包装器落到本机 Cursor。
- **默认用 Cursor**：在 `openclaw.json` 的 `acp` 里设 `"defaultAgent": "cursor"`。
- **命令行自测**：`echo "hello" | .../bin/acpx-wrapper --format json --json-strict --cwd /tmp cursor prompt --session test1 --file -`

## 验证

- **包装器 + Cursor**：
  ```bash
  echo "hello" | ACPX_REAL=/path/to/real/acpx /path/to/openclaw-cursor-acp/bin/acpx-wrapper --format json --json-strict --cwd /tmp cursor prompt --session test1 --file -
  ```
- **OpenClaw**：使用 `sessions_spawn`，`runtime: "acp"`，`agentId: "cursor"`，确认会话能创建并收到 acpx 格式事件。

## 路径说明

- 包装脚本：`/path/to/openclaw-cursor-acp/bin/acpx-wrapper`
- 桥接入口：`bin/bridge.js`（由 wrapper 在 agent=cursor 时用 node 执行）
- 部署备份：`workspace/projects/openclaw-cursor-acp/deploy-backup/`
- 配置备份：`workspace/backups/openclaw.json.bak.pre-openclaw-cursor-acp-*`
