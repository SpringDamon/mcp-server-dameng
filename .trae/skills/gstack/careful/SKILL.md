---
name: careful
version: 0.1.0
description: |
  破坏性命令的安全防护措施。在执行 rm -rf、DROP TABLE、
  force-push、git reset --hard、kubectl delete 等破坏性操作前发出警告。
  用户可以覆盖每条警告。在操作生产环境、调试线上系统或共享环境中工作时使用。
  当被要求"小心"、"安全模式"、"生产模式"或"谨慎模式"时使用。(gstack)
triggers:
  - 小心
  - 执行破坏性操作前警告
  - 安全模式
allowed-tools:
  - Bash
  - Read
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "bash ${CLAUDE_SKILL_DIR}/bin/check-careful.sh"
          statusMessage: "正在检查破坏性命令..."
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- 自动生成自 SKILL.md.tmpl — 请勿直接编辑 -->
<!-- 重新生成: bun run gen:skill-docs -->

# /careful — 破坏性命令安全防护

安全模式现已**激活**。每个 bash 命令在运行前都会检查是否包含破坏性模式。
如果检测到破坏性命令，你将收到警告，并可以选择继续执行或取消。

```bash
mkdir -p ~/.gstack/analytics
echo '{"skill":"careful","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> ~/.gstack/analytics/skill-usage.jsonl 2>/dev/null || true
```

## 受保护的操作

| 模式 | 示例 | 风险 |
|---------|---------|------|
| `rm -rf` / `rm -r` / `rm --recursive` | `rm -rf /var/data` | 递归删除 |
| `DROP TABLE` / `DROP DATABASE` | `DROP TABLE users;` | 数据丢失 |
| `TRUNCATE` | `TRUNCATE orders;` | 数据丢失 |
| `git push --force` / `-f` | `git push -f origin main` | 重写历史记录 |
| `git reset --hard` | `git reset --hard HEAD~3` | 丢失未提交的修改 |
| `git checkout .` / `git restore .` | `git checkout .` | 丢失未提交的修改 |
| `kubectl delete` | `kubectl delete pod` | 影响生产环境 |
| `docker rm -f` / `docker system prune` | `docker system prune -a` | 容器/镜像丢失 |

## 安全例外

以下模式无需警告即可执行：
- `rm -rf node_modules` / `.next` / `dist` / `__pycache__` / `.cache` / `build` / `.turbo` / `coverage`

## 工作原理

钩子（hook）从工具输入的 JSON 中读取命令，对照上述模式进行检查。
如果发现匹配项，则返回 `permissionDecision: "ask"` 并附带警告消息。
你始终可以选择覆盖警告并继续执行。

要停用它，结束当前会话或开启新会话即可。钩子仅在会话范围内生效。
