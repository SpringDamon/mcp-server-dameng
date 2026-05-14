---
name: freeze
version: 0.1.0
description: |
  将会话中的文件编辑限制在指定目录内。阻止在允许路径之外进行编辑(Edit)和写入(Write)操作。
  在调试时使用此功能可防止意外"修复"无关代码，或当你希望将更改限定在某个模块内时使用。
  当被要求"冻结(freeze)"、"限制编辑(restrict edits)"、"仅编辑此文件夹(only edit this folder)"
  或"锁定编辑(lock down edits)"时使用。(gstack)
triggers:
  - freeze edits to directory
  - lock editing scope
  - restrict file changes
allowed-tools:
  - Bash
  - Read
  - AskUserQuestion
hooks:
  PreToolUse:
    - matcher: "Edit"
      hooks:
        - type: command
          command: "bash ${CLAUDE_SKILL_DIR}/bin/check-freeze.sh"
          statusMessage: "检查冻结边界..."
    - matcher: "Write"
      hooks:
        - type: command
          command: "bash ${CLAUDE_SKILL_DIR}/bin/check-freeze.sh"
          statusMessage: "检查冻结边界..."
---
<!-- 从 SKILL.md.tmpl 自动生成 — 请勿直接编辑此文件 -->
<!-- 重新生成命令: bun run gen:skill-docs -->

# /freeze — 将编辑限制在指定目录

将文件编辑锁定在特定目录内。任何针对允许路径之外的编辑(Edit)或写入(Write)操作将被**阻止**(不仅仅是警告)。

```bash
mkdir -p ~/.gstack/analytics
echo '{"skill":"freeze","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> ~/.gstack/analytics/skill-usage.jsonl 2>/dev/null || true
```

## 设置步骤

询问用户要将编辑限制在哪个目录。使用 AskUserQuestion:

- 问题: "我应该将编辑限制在哪个目录？此路径之外的文件将被禁止编辑。"
- 文本输入(非多选) — 用户输入一个路径。

用户提供目录路径后:

1. 将其解析为绝对路径:
```bash
FREEZE_DIR=$(cd "<user-provided-path>" 2>/dev/null && pwd)
echo "$FREEZE_DIR"
```

2. 确保带有尾部斜杠并保存到冻结状态文件:
```bash
FREEZE_DIR="${FREEZE_DIR%/}/"
STATE_DIR="${CLAUDE_PLUGIN_DATA:-$HOME/.gstack}"
mkdir -p "$STATE_DIR"
echo "$FREEZE_DIR" > "$STATE_DIR/freeze-dir.txt"
echo "冻结边界已设置: $FREEZE_DIR"
```

告知用户: "现在编辑已限制在 `<path>/` 内。此目录外的任何编辑(Edit)或写入(Write)操作将被阻止。
要更改边界，请再次运行 `/freeze`。要移除限制，请运行 `/unfreeze` 或结束会话。"

## 工作原理

钩子(hook)从 Edit/Write 工具的输入 JSON 中读取 `file_path`，然后检查该路径是否以冻结目录开头。
如果不是，则返回 `permissionDecision: "deny"` 以阻止该操作。

冻结边界通过状态文件在会话期间持续存在。钩子脚本在每次调用 Edit/Write 时都会读取它。

## 注意事项

- 冻结目录末尾的 `/` 可防止 `/src` 错误匹配到 `/src-old`
- 冻结仅适用于 Edit 和 Write 工具 — Read、Bash、Glob、Grep 不受影响
- 这仅防止意外编辑，不是安全边界 — Bash 命令(如 `sed`)仍然可以修改边界之外的文件
- 要停用此功能，请运行 `/unfreeze` 或结束对话
