# 如何真实使用 Cursor（通过 OpenClaw ACP）

部署完成后，OpenClaw 已把「acpx」指向本包装器；当请求 **agentId: "cursor"** 时会走桥接，在你这台机器上真实调用 Cursor 的 `agent acp`。

## 1. 前置条件

- **Cursor**：本机已安装 Cursor，且支持 `agent acp`（即 Cursor 的 ACP 模式可用）。
- **OpenClaw**：网关/渠道已正常运行（如飞书、Telegram 已连上）。

## 2. 在渠道里用（飞书 / Telegram 等）

对话里**用自然语言说明「用 Cursor 做 coding」**即可，例如：

- 「用 Cursor 在 /tmp 下写一个 hello world」
- 「用 ACP 跑 Cursor，在项目里加个单元测试」
- 「让 Cursor 帮我重构这段逻辑」

OpenClaw 的主 agent 会看到 `sessions_spawn` 工具；当它判断你要的是「在对话里跑 coding agent」时，会调用：

- `runtime: "acp"`
- `agentId: "cursor"`（必须带上才会走 Cursor）

因此你**不用记命令**，只要在消息里明确提到「Cursor」或「用 ACP 跑 Cursor」即可。

若希望**默认就用 Cursor**（不指定 agent 时也用 Cursor），可在 `openclaw.json` 里设：

```json
"acp": {
  "enabled": true,
  "allowedAgents": ["codex", "claudecode", "gemini", "cursor"],
  "defaultAgent": "cursor"
}
```

## 3. 命令行快速自测（不经过 OpenClaw）

不通过飞书/Telegram，直接验证「包装器 + Cursor」是否正常：

```bash
# 建会话并发一条 prompt（stdin 为内容）
echo "用一句话介绍你自己" | ./bin/acpx-wrapper \
  --format json --json-strict --cwd /tmp \
  cursor prompt --session cli-test --file -
```

若 Cursor 在本机可用，你会看到多行 JSON（如 `type: "text"`、最后 `type: "done"`）。

## 4. 会话与多轮

- 同一 `--session <name>` 会复用同一 Cursor 会话，实现多轮对话。
- 会话名与 Cursor 内部 session 的对应关系存在 `~/.acp2acpx/sessions.json`（可用环境变量 `ACP2ACPX_SESSIONS_FILE` 改路径）。

## 5. 若没走 Cursor

- 确认消息里提到了「Cursor」或「用 ACP 跑 Cursor」，否则 agent 可能选了 codex/claudecode 等。
- 确认 `openclaw.json` 里 `acp.allowedAgents` 包含 `"cursor"`。
- 看 OpenClaw 日志里是否有 acpx 调用错误（如 command not found、bridge 报错等）。
