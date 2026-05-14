---
name: guard
version: 0.1.0
description: |
  完整安全模式：破坏性命令警告 + 目录范围编辑限制。
  结合了 /careful（在执行 rm -rf、DROP TABLE、强制推送等操作前发出警告）与
  /freeze（阻止在指定目录外进行编辑）。在需要接触生产环境或调试线上系统时使用，
  以获得最高级别的安全保障。当用户要求进入"防护模式"、"完整安全"、"锁定"或"最高安全"时触发。(gstack)
triggers:
  - full safety mode
  - guard against mistakes
  - maximum safety
allowed-tools:
  - Bash
  - Read
  - AskUserQuestion
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "bash ${CLAUDE_SKILL_DIR}/../careful/bin/check-careful.sh"
          statusMessage: "Checking for destructive commands..."
    - matcher: "Edit"
      hooks:
        - type: command
          command: "bash ${CLAUDE_SKILL_DIR}/../freeze/bin/check-freeze.sh"
          statusMessage: "Checking freeze boundary..."
    - matcher: "Write"
      hooks:
        - type: command
          command: "bash ${CLAUDE_SKILL_DIR}/../freeze/bin/check-freeze.sh"
          statusMessage: "Checking freeze boundary..."
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: bun run gen:skill-docs -->

# /guard — 完整安全模式

同时启用破坏性命令警告和目录范围的编辑限制。
这是将 `/careful` 和 `/freeze` 组合在一起的综合命令。

**依赖说明：** 本技能引用了同级的 `/careful` 和 `/freeze` 技能目录中的钩子脚本。
这两个技能必须已安装（它们会通过 gstack 安装脚本一起安装）。

```bash
mkdir -p ~/.gstack/analytics
echo '{"skill":"guard","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> ~/.gstack/analytics/skill-usage.jsonl 2>/dev/null || true
```

## 设置步骤

向用户确认需要将编辑限制在哪个目录。使用 AskUserQuestion：

- 问题："防护模式：应将编辑限制在哪个目录？破坏性命令警告始终开启。所选路径之外的文件将被禁止编辑。"
- 文本输入（非多项选择）— 用户手动输入路径。

用户提供目录路径后：

1. 将其解析为绝对路径：
```bash
FREEZE_DIR=$(cd "<user-provided-path>" 2>/dev/null && pwd)
echo "$FREEZE_DIR"
```

2. 确保末尾带斜杠，并保存到冻结状态文件：
```bash
FREEZE_DIR="${FREEZE_DIR%/}/"
STATE_DIR="${CLAUDE_PLUGIN_DATA:-$HOME/.gstack}"
mkdir -p "$STATE_DIR"
echo "$FREEZE_DIR" > "$STATE_DIR/freeze-dir.txt"
echo "Freeze boundary set: $FREEZE_DIR"
```

告知用户：
- "**防护模式已激活。** 两项保护措施现已生效："
- "1. **破坏性命令警告** — rm -rf、DROP TABLE、强制推送等操作在执行前会发出警告（你可以选择覆盖）"
- "2. **编辑边界** — 文件编辑仅限于 `<path>/` 目录内。该目录之外的编辑将被阻止。"
- "如需移除编辑边界，请运行 `/unfreeze`。如需停用所有保护，结束当前会话即可。"

## 保护范围

完整的破坏性命令模式列表和安全例外情况，请参阅 `/careful`。
编辑边界 enforcement（强制实施）的工作方式，请参阅 `/freeze`。
