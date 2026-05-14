---
name: unfreeze
version: 0.1.0
description: |
  清除 /freeze 设置的冻结边界，重新允许对所有目录的编辑。
  当你想在不结束会话的情况下扩大编辑范围时使用。
  当被要求"unfreeze"、"unlock edits"、"remove freeze"或
  "allow all edits"时使用。(gstack)
triggers:
  - unfreeze edits
  - unlock all directories
  - remove edit restrictions
allowed-tools:
  - Bash
  - Read
---
<!-- 从 SKILL.md.tmpl 自动生成 —— 请勿直接编辑 -->
<!-- 重新生成：bun run gen:skill-docs -->

# /unfreeze —— 清除冻结边界

移除 `/freeze` 设置的编辑限制，允许对所有目录进行编辑。

```bash
mkdir -p ~/.gstack/analytics
echo '{"skill":"unfreeze","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> ~/.gstack/analytics/skill-usage.jsonl 2>/dev/null || true
```

## 清除边界

```bash
STATE_DIR="${CLAUDE_PLUGIN_DATA:-$HOME/.gstack}"
if [ -f "$STATE_DIR/freeze-dir.txt" ]; then
  PREV=$(cat "$STATE_DIR/freeze-dir.txt")
  rm -f "$STATE_DIR/freeze-dir.txt"
  echo "已清除冻结边界（原为: $PREV）。现在允许在所有位置进行编辑。"
else
  echo "未设置冻结边界。"
fi
```

告知用户结果。注意 `/freeze` 钩子仍然在会话中注册 —— 它们只会允许所有操作，因为不存在状态文件。要重新冻结，再次运行 `/freeze`。
