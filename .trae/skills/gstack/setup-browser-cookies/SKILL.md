---
name: setup-browser-cookies
preamble-tier: 1
version: 1.0.0
description: |
  将你真实 Chromium 浏览器中的 Cookie 导入到无头浏览会话中。
  打开一个交互式选择器 UI，让你选择要导入哪些 Cookie 域名。
  在测试需要认证的页面前使用。当被要求"导入 Cookie"、
  "登录站点"或"验证浏览器身份"时使用。(gstack)
triggers:
  - 导入浏览器 Cookie
  - 登录测试站点
  - 建立已认证会话
allowed-tools:
  - Bash
  - Read
  - AskUserQuestion
---
<!-- 从 SKILL.md.tmpl 自动生成 — 请勿直接编辑此文件 -->
<!-- 重新生成: bun run gen:skill-docs -->

## Preamble（最先运行）

```bash
_UPD=$(.trae/skills/gstack/bin/gstack-update-check 2>/dev/null || .trae/skills/gstack/bin/gstack-update-check 2>/dev/null || true)
[ -n "$_UPD" ] && echo "$_UPD" || true
mkdir -p ~/.gstack/sessions
touch ~/.gstack/sessions/"$PPID"
_SESSIONS=$(find ~/.gstack/sessions -mmin -120 -type f 2>/dev/null | wc -l | tr -d ' ')
find ~/.gstack/sessions -mmin +120 -type f -exec rm {} + 2>/dev/null || true
_PROACTIVE=$(.trae/skills/gstack/bin/gstack-config get proactive 2>/dev/null || echo "true")
_PROACTIVE_PROMPTED=$([ -f ~/.gstack/.proactive-prompted ] && echo "yes" || echo "no")
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "BRANCH: $_BRANCH"
_SKILL_PREFIX=$(.trae/skills/gstack/bin/gstack-config get skill_prefix 2>/dev/null || echo "false")
echo "PROACTIVE: $_PROACTIVE"
echo "PROACTIVE_PROMPTED: $_PROACTIVE_PROMPTED"
echo "SKILL_PREFIX: $_SKILL_PREFIX"
source <(.trae/skills/gstack/bin/gstack-repo-mode 2>/dev/null) || true
REPO_MODE=${REPO_MODE:-unknown}
echo "REPO_MODE: $REPO_MODE"
_LAKE_SEEN=$([ -f ~/.gstack/.completeness-intro-seen ] && echo "yes" || echo "no")
echo "LAKE_INTRO: $_LAKE_SEEN"
_TEL=$(.trae/skills/gstack/bin/gstack-config get telemetry 2>/dev/null || true)
_TEL_PROMPTED=$([ -f ~/.gstack/.telemetry-prompted ] && echo "yes" || echo "no")
_TEL_START=$(date +%s)
_SESSION_ID="$$-$(date +%s)"
echo "TELEMETRY: ${_TEL:-off}"
echo "TEL_PROMPTED: $_TEL_PROMPTED"
_EXPLAIN_LEVEL=$(.trae/skills/gstack/bin/gstack-config get explain_level 2>/dev/null || echo "default")
if [ "$_EXPLAIN_LEVEL" != "default" ] && [ "$_EXPLAIN_LEVEL" != "terse" ]; then _EXPLAIN_LEVEL="default"; fi
echo "EXPLAIN_LEVEL: $_EXPLAIN_LEVEL"
_QUESTION_TUNING=$(.trae/skills/gstack/bin/gstack-config get question_tuning 2>/dev/null || echo "false")
echo "QUESTION_TUNING: $_QUESTION_TUNING"
mkdir -p ~/.gstack/analytics
if [ "$_TEL" != "off" ]; then
echo '{"skill":"setup-browser-cookies","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> ~/.gstack/analytics/skill-usage.jsonl 2>/dev/null || true
fi
for _PF in $(find ~/.gstack/analytics -maxdepth 1 -name '.pending-*' 2>/dev/null); do
  if [ -f "$_PF" ]; then
    if [ "$_TEL" != "off" ] && [ -x ".trae/skills/gstack/bin/gstack-telemetry-log" ]; then
      .trae/skills/gstack/bin/gstack-telemetry-log --event-type skill_run --skill _pending_finalize --outcome unknown --session-id "$_SESSION_ID" 2>/dev/null || true
    fi
    rm -f "$_PF" 2>/dev/null || true
  fi
  break
done
eval "$(.trae/skills/gstack/bin/gstack-slug 2>/dev/null)" 2>/dev/null || true
_LEARN_FILE="${GSTACK_HOME:-$HOME/.gstack}/projects/${SLUG:-unknown}/learnings.jsonl"
if [ -f "$_LEARN_FILE" ]; then
  _LEARN_COUNT=$(wc -l < "$_LEARN_FILE" 2>/dev/null | tr -d ' ')
  echo "LEARNINGS: $_LEARN_COUNT entries loaded"
  if [ "$_LEARN_COUNT" -gt 5 ] 2>/dev/null; then
    .trae/skills/gstack/bin/gstack-learnings-search --limit 3 2>/dev/null || true
  fi
else
  echo "LEARNINGS: 0"
fi
.trae/skills/gstack/bin/gstack-timeline-log '{"skill":"setup-browser-cookies","event":"started","branch":"'"$_BRANCH"'","session":"'"$_SESSION_ID"'"}' 2>/dev/null &
_HAS_ROUTING="no"
if [ -f CLAUDE.md ] && grep -q "## Skill routing" CLAUDE.md 2>/dev/null; then
  _HAS_ROUTING="yes"
fi
_ROUTING_DECLINED=$(.trae/skills/gstack/bin/gstack-config get routing_declined 2>/dev/null || echo "false")
echo "HAS_ROUTING: $_HAS_ROUTING"
echo "ROUTING_DECLINED: $_ROUTING_DECLINED"
_VENDORED="no"
if [ -d ".trae/skills/gstack" ] && [ ! -L ".trae/skills/gstack" ]; then
  if [ -f ".trae/skills/gstack/VERSION" ] || [ -d ".trae/skills/gstack/.git" ]; then
    _VENDORED="yes"
  fi
fi
echo "VENDORED_GSTACK: $_VENDORED"
echo "MODEL_OVERLAY: claude"
_CHECKPOINT_MODE=$(.trae/skills/gstack/bin/gstack-config get checkpoint_mode 2>/dev/null || echo "explicit")
_CHECKPOINT_PUSH=$(.trae/skills/gstack/bin/gstack-config get checkpoint_push 2>/dev/null || echo "false")
echo "CHECKPOINT_MODE: $_CHECKPOINT_MODE"
echo "CHECKPOINT_PUSH: $_CHECKPOINT_PUSH"
[ -n "$OPENCLAW_SESSION" ] && echo "SPAWNED_SESSION: true" || true
```

## Plan Mode 安全操作

在 Plan 模式下，以下操作是允许的，因为它们有助于制定计划：`$B`、`$D`、`codex exec`/`codex review`、写入 `~/.gstack/`、写入计划文件，以及使用 `open` 打开生成的产物。

## Plan 模式下的技能调用

如果用户在 Plan 模式下调用了某个技能，该技能优先于通用的 Plan 模式行为。**将技能文件视为可执行指令，而非参考资料。** 从 Step 0 开始逐步遵循；第一个 AskUserQuestion 表示工作流进入 Plan 模式，而不是违反它。AskUserQuestion 满足 Plan 模式结束轮次的要求。在 STOP 点，立即停止。不要继续工作流或在此处调用 ExitPlanMode。标记为"PLAN MODE EXCEPTION — ALWAYS RUN"（Plan 模式例外 — 始终运行）的命令会执行。仅在技能工作流完成后，或者用户要求取消技能或离开 Plan 模式时，才调用 ExitPlanMode。

如果 `PROACTIVE` 为 `"false"`，不要自动调用或主动建议技能。如果某个技能看起来有用，询问："我认为 /skillname 可能对此有帮助 — 要我运行吗？"

如果 `SKILL_PREFIX` 为 `"true"`，建议使用/调用 `/gstack-*` 名称。磁盘路径保持 `.trae/skills/gstack/[skill-name]/SKILL.md`。

如果输出显示 `UPGRADE_AVAILABLE <old> <new>`：读取 `.trae/skills/gstack/gstack-upgrade/SKILL.md` 并遵循"内联升级流程"（如果已配置则自动升级，否则通过 AskUserQuestion 提供 4 个选项，如果用户拒绝则写入延后状态）。

如果输出显示 `JUST_UPGRADED <from> <to>`：打印 "Running gstack v{to} (just updated!)"。如果 `SPAWNED_SESSION` 为 true，跳过功能发现。

功能发现，每个会话最多提示一次：
- 缺少 `.trae/skills/gstack/.feature-prompted-continuous-checkpoint`：使用 AskUserQuestion 询问连续检查点自动提交。如果接受，运行 `.trae/skills/gstack/bin/gstack-config set checkpoint_mode continuous`。始终触碰标记文件。
- 缺少 `.trae/skills/gstack/.feature-prompted-model-overlay`：告知"模型覆盖已激活。MODEL_OVERLAY 显示补丁。"始终触碰标记文件。

升级提示后，继续工作流。

如果 `WRITING_STYLE_PENDING` 为 `yes`：询问一次关于写作风格的问题：

> v1 提示更简洁：首次使用时添加术语注释，以结果为导向的提问，更简洁的文字。保持默认或恢复简洁？

选项：
- A) 保持新的默认设置（推荐 — 好的写作对每个人都有帮助）
- B) 恢复 V0 风格 — 设置 `explain_level: terse`

如果选择 A：保持 `explain_level` 未设置（默认为 `default`）。
如果选择 B：运行 `.trae/skills/gstack/bin/gstack-config set explain_level terse`。

无论选择什么都要运行：
```bash
rm -f ~/.gstack/.writing-style-prompt-pending
touch ~/.gstack/.writing-style-prompted
```

如果 `WRITING_STYLE_PENDING` 为 `no`，则跳过。

如果 `LAKE_INTRO` 为 `no`：说"gstack 遵循 **Boil the Lake** 原则 — 当 AI 使边际成本趋近于零时，做完整的事情。了解更多：https://garryslist.org/posts/boil-the-ocean" 提供打开选项：

```bash
open https://garryslist.org/posts/boil-the-ocean
touch ~/.gstack/.completeness-intro-seen
```

仅在用户同意时运行 `open`。始终运行 `touch`。

如果 `TEL_PROMPTED` 为 `no` 且 `LAKE_INTRO` 为 `yes`：通过 AskUserQuestion 询问一次遥测设置：

> 帮助 gstack 变得更好。仅分享使用数据：技能、持续时间、崩溃、稳定的设备 ID。不包含代码、文件路径或仓库名称。

选项：
- A) 帮助 gstack 变得更好！（推荐）
- B) 不了，谢谢

如果选择 A：运行 `.trae/skills/gstack/bin/gstack-config set telemetry community`

如果选择 B：追问：

> 匿名模式仅发送聚合使用数据，不包含唯一 ID。

选项：
- A) 可以，匿名没问题
- B) 不了，谢谢，完全关闭

如果 B→A：运行 `.trae/skills/gstack/bin/gstack-config set telemetry anonymous`
如果 B→B：运行 `.trae/skills/gstack/bin/gstack-config set telemetry off`

始终运行：
```bash
touch ~/.gstack/.telemetry-prompted
```

如果 `TEL_PROMPTED` 为 `yes`，则跳过。

如果 `PROACTIVE_PROMPTED` 为 `no` 且 `TEL_PROMPTED` 为 `yes`：询问一次：

> 让 gstack 主动建议技能，比如遇到"这个能工作吗？"时建议 /qa，或者遇到 bug 时建议 /investigate？

选项：
- A) 保持开启（推荐）
- B) 关闭 — 我会自己输入 /命令

如果选择 A：运行 `.trae/skills/gstack/bin/gstack-config set proactive true`
如果选择 B：运行 `.trae/skills/gstack/bin/gstack-config set proactive false`

始终运行：
```bash
touch ~/.gstack/.proactive-prompted
```

如果 `PROACTIVE_PROMPTED` 为 `yes`，则跳过。

如果 `HAS_ROUTING` 为 `no` 且 `ROUTING_DECLINED` 为 `false` 且 `PROACTIVE_PROMPTED` 为 `yes`：
检查项目根目录是否存在 CLAUDE.md 文件。如果不存在，创建它。

使用 AskUserQuestion：

> gstack 在项目的 CLAUDE.md 包含技能路由规则时工作效果最佳。

选项：
- A) 在 CLAUDE.md 中添加路由规则（推荐）
- B) 不了，谢谢，我会手动调用技能

如果选择 A：将以下内容追加到 CLAUDE.md 末尾：

```markdown

## 技能路由

当用户的请求与可用技能匹配时，通过 Skill 工具调用它。如果不确定，就调用该技能。

关键路由规则：
- 产品创意/头脑风暴 → 调用 /office-hours
- 策略/范围 → 调用 /plan-ceo-review
- 架构 → 调用 /plan-eng-review
- 设计系统/计划审查 → 调用 /design-consultation 或 /plan-design-review
- 完整审查流水线 → 调用 /autoplan
- Bug/错误 → 调用 /investigate
- QA/测试站点行为 → 调用 /qa 或 /qa-only
- 代码审查/diff 检查 → 调用 /review
- 视觉优化 → 调用 /design-review
- 发布/部署/PR → 调用 /ship 或 /land-and-deploy
- 保存进度 → 调用 /context-save
- 恢复上下文 → 调用 /context-restore
```

然后提交更改：`git add CLAUDE.md && git commit -m "chore: add gstack skill routing rules to CLAUDE.md"`

如果选择 B：运行 `.trae/skills/gstack/bin/gstack-config set routing_declined true`，并告知用户可以通过 `gstack-config set routing_declined false` 重新启用。

每个项目只会发生一次。如果 `HAS_ROUTING` 为 `yes` 或 `ROUTING_DECLINED` 为 `true`，则跳过。

如果 `VENDORED_GSTACK` 为 `yes`，且 `~/.gstack/.vendoring-warned-$SLUG` 不存在，则通过 AskUserQuestion 警告一次：

> 此项目在 `.trae/skills/gstack/` 中 vendored 了 gstack。Vendoring 已被弃用。
> 迁移到团队模式？

选项：
- A) 是的，现在迁移到团队模式
- B) 不了，我自己处理

如果选择 A：
1. 运行 `git rm -r .trae/skills/gstack/`
2. 运行 `echo '.trae/skills/gstack/' >> .gitignore`
3. 运行 `.trae/skills/gstack/bin/gstack-team-init required`（或 `optional`）
4. 运行 `git add .claude/ .gitignore CLAUDE.md && git commit -m "chore: migrate gstack from vendored to team mode"`
5. 告知用户："完成。现在每个开发者运行：`cd .trae/skills/gstack && ./setup --team`"

如果选择 B：说"好的，你需要自己保持 vendored 副本更新。"

无论选择什么都要运行：
```bash
eval "$(.trae/skills/gstack/bin/gstack-slug 2>/dev/null)" 2>/dev/null || true
touch ~/.gstack/.vendoring-warned-${SLUG:-unknown}
```

如果标记文件已存在，则跳过。

如果 `SPAWNED_SESSION` 为 `"true"`，你正在一个由 AI 编排器（如 OpenClaw）生成的会话中运行。在生成的会话中：
- 不要在交互式提示中使用 AskUserQuestion。自动选择推荐选项。
- 不要运行升级检查、遥测提示、路由注入或 lake 介绍。
- 专注于完成任务并通过文本输出报告结果。
- 以完成报告结束：发布了什么、做出了哪些决策、任何不确定的事项。

## GBrain 同步（技能启动时）

```bash
_GSTACK_HOME="${GSTACK_HOME:-$HOME/.gstack}"
_BRAIN_REMOTE_FILE="$HOME/.gstack-brain-remote.txt"
_BRAIN_SYNC_BIN=".trae/skills/gstack/bin/gstack-brain-sync"
_BRAIN_CONFIG_BIN=".trae/skills/gstack/bin/gstack-config"

_BRAIN_SYNC_MODE=$("$_BRAIN_CONFIG_BIN" get gbrain_sync_mode 2>/dev/null || echo off)

if [ -f "$_BRAIN_REMOTE_FILE" ] && [ ! -d "$_GSTACK_HOME/.git" ] && [ "$_BRAIN_SYNC_MODE" = "off" ]; then
  _BRAIN_NEW_URL=$(head -1 "$_BRAIN_REMOTE_FILE" 2>/dev/null | tr -d '[:space:]')
  if [ -n "$_BRAIN_NEW_URL" ]; then
    echo "BRAIN_SYNC: brain repo detected: $_BRAIN_NEW_URL"
    echo "BRAIN_SYNC: run 'gstack-brain-restore' to pull your cross-machine memory (or 'gstack-config set gbrain_sync_mode off' to dismiss forever)"
  fi
fi

if [ -d "$_GSTACK_HOME/.git" ] && [ "$_BRAIN_SYNC_MODE" != "off" ]; then
  _BRAIN_LAST_PULL_FILE="$_GSTACK_HOME/.brain-last-pull"
  _BRAIN_NOW=$(date +%s)
  _BRAIN_DO_PULL=1
  if [ -f "$_BRAIN_LAST_PULL_FILE" ]; then
    _BRAIN_LAST=$(cat "$_BRAIN_LAST_PULL_FILE" 2>/dev/null || echo 0)
    _BRAIN_AGE=$(( _BRAIN_NOW - _BRAIN_LAST ))
    [ "$_BRAIN_AGE" -lt 86400 ] && _BRAIN_DO_PULL=0
  fi
  if [ "$_BRAIN_DO_PULL" = "1" ]; then
    ( cd "$_GSTACK_HOME" && git fetch origin >/dev/null 2>&1 && git merge --ff-only "origin/$(git rev-parse --abbrev-ref HEAD)" >/dev/null 2>&1 ) || true
    echo "$_BRAIN_NOW" > "$_BRAIN_LAST_PULL_FILE"
  fi
  "$_BRAIN_SYNC_BIN" --once 2>/dev/null || true
fi

if [ -d "$_GSTACK_HOME/.git" ] && [ "$_BRAIN_SYNC_MODE" != "off" ]; then
  _BRAIN_QUEUE_DEPTH=0
  [ -f "$_GSTACK_HOME/.brain-queue.jsonl" ] && _BRAIN_QUEUE_DEPTH=$(wc -l < "$_GSTACK_HOME/.brain-queue.jsonl" | tr -d ' ')
  _BRAIN_LAST_PUSH="never"
  [ -f "$_GSTACK_HOME/.brain-last-push" ] && _BRAIN_LAST_PUSH=$(cat "$_GSTACK_HOME/.brain-last-push" 2>/dev/null || echo never)
  echo "BRAIN_SYNC: mode=$_BRAIN_SYNC_MODE | last_push=$_BRAIN_LAST_PUSH | queue=$_BRAIN_QUEUE_DEPTH"
else
  echo "BRAIN_SYNC: off"
fi
```



隐私停止门：如果输出显示 `BRAIN_SYNC: off`，`gbrain_sync_mode_prompted` 为 `false`，且 gbrain 在 PATH 中或 `gbrain doctor --fast --json` 可正常工作，询问一次：

> gstack 可以将你的会话内存发布到一个私有 GitHub 仓库，由 GBrain 跨机器索引。应该同步多少内容？

选项：
- A) 所有允许列表中的内容（推荐）
- B) 仅产物（artifacts）
- C) 拒绝，所有内容保持本地

回答后：

```bash
# 选择的模式: full（完整） | artifacts-only（仅产物） | off（关闭）
"$_BRAIN_CONFIG_BIN" set gbrain_sync_mode <choice>
"$_BRAIN_CONFIG_BIN" set gbrain_sync_mode_prompted true
```

如果选择 A/B 且 `~/.gstack/.git` 不存在，询问是否运行 `gstack-brain-init`。不要阻塞技能执行。

在技能结束前、遥测之前：

```bash
".trae/skills/gstack/bin/gstack-brain-sync" --discover-new 2>/dev/null || true
".trae/skills/gstack/bin/gstack-brain-sync" --once 2>/dev/null || true
```


## 模型特定行为补丁（claude）

以下调整针对 claude 模型系列进行了优化。它们
**从属于** 技能工作流、STOP 点、AskUserQuestion 门控、plan 模式
安全性和 /ship 审查门控。如果以下调整与技能指令冲突，
以技能指令为准。将这些视为偏好，而非规则。

**待办列表纪律。** 在执行多步计划时，每完成一个任务就单独标记为完成。不要在最后批量完成。如果某个任务被发现是不必要的，标记为跳过并附上一行理由。

**在执行重大操作前先思考。** 对于复杂操作（重构、迁移、
重要的新功能），在执行前简要说明你的方法。这让用户可以低成本地纠正方向，而不是在操作中途。

**使用专用工具而非 Bash。** 优先使用 Read、Edit、Write、Glob、Grep 而非 shell 等价命令（cat、sed、find、grep）。专用工具更廉价、更清晰。

## 语气

直接、具体，开发者对开发者的风格。说出文件名、函数名、命令和用户可见的影响。不要废话。

不使用破折号。不使用 AI 常用词汇：delve、crucial、robust、comprehensive、nuanced、multifaceted。永远不要企业化或学术化。短段落。以接下来要做的事情结尾。

用户拥有你不知道的上下文。跨模型的一致意见是建议，而非决定。由用户来决定。

## 完成状态协议

在完成技能工作流时，使用以下之一报告状态：
- **DONE** — 已完成并有证据支持。
- **DONE_WITH_CONCERNS** — 已完成，但列出担忧。
- **BLOCKED** — 无法继续；说明阻碍和已尝试的方法。
- **NEEDS_CONTEXT** — 缺少信息；准确说明需要什么。

在 3 次失败尝试后、不确定的安全敏感更改，或无法验证的范围时升级。格式：`STATUS`、`REASON`、`ATTEMPTED`、`RECOMMENDATION`。

## 操作自我改进

在完成之前，如果你发现了一个可复用的项目特性或命令修复，下次可以节省 5+ 分钟，记录下来：

```bash
.trae/skills/gstack/bin/gstack-learnings-log '{"skill":"SKILL_NAME","type":"operational","key":"SHORT_KEY","insight":"DESCRIPTION","confidence":N,"source":"observed"}'
```

不要记录明显的事实或一次性瞬态错误。

## 遥测（最后运行）

在工作流完成后，记录遥测数据。使用 frontmatter 中的技能 `name:`。OUTCOME 为 success/error/abort/unknown。

**PLAN MODE EXCEPTION — ALWAYS RUN：** 此命令将遥测写入
`~/.gstack/analytics/`，与 preamble 分析写入相匹配。

运行此 bash：

```bash
_TEL_END=$(date +%s)
_TEL_DUR=$(( _TEL_END - _TEL_START ))
rm -f ~/.gstack/analytics/.pending-"$_SESSION_ID" 2>/dev/null || true
# Session timeline: 记录技能完成（仅本地，从不发送到任何地方）
.trae/skills/gstack/bin/gstack-timeline-log '{"skill":"SKILL_NAME","event":"completed","branch":"'$(git branch --show-current 2>/dev/null || echo unknown)'","outcome":"OUTCOME","duration_s":"'"$_TEL_DUR"'","session":"'"$_SESSION_ID"'"}' 2>/dev/null || true
# 本地分析（受遥测设置限制）
if [ "$_TEL" != "off" ]; then
echo '{"skill":"SKILL_NAME","duration_s":"'"$_TEL_DUR"'","outcome":"OUTCOME","browse":"USED_BROWSE","session":"'"$_SESSION_ID"'","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' >> ~/.gstack/analytics/skill-usage.jsonl 2>/dev/null || true
fi
# 远程遥测（选择加入，需要二进制文件）
if [ "$_TEL" != "off" ] && [ -x .trae/skills/gstack/bin/gstack-telemetry-log ]; then
  .trae/skills/gstack/bin/gstack-telemetry-log \
    --skill "SKILL_NAME" --duration "$_TEL_DUR" --outcome "OUTCOME" \
    --used-browse "USED_BROWSE" --session-id "$_SESSION_ID" 2>/dev/null &
fi
```

运行前替换 `SKILL_NAME`、`OUTCOME` 和 `USED_BROWSE`。

## Plan 状态页脚

在 Plan 模式下、ExitPlanMode 之前：如果计划文件缺少 `## GSTACK REVIEW REPORT`，运行 `.trae/skills/gstack/bin/gstack-review-read` 并追加标准的运行/状态/发现表格。如果为 `NO_REVIEWS` 或空，追加一个 5 行的占位符，结论为"NO REVIEWS YET — 运行 `/autoplan`"。如果存在更丰富的报告，则跳过。

PLAN MODE EXCEPTION — 始终允许（这是计划文件）。

# 设置浏览器 Cookie

将已登录的会话从你真实的 Chromium 浏览器导入到无头浏览会话中。

## CDP 模式检查

首先，检查 browse 是否已连接到用户的真实浏览器：
```bash
$B status 2>/dev/null | grep -q "Mode: cdp" && echo "CDP_MODE=true" || echo "CDP_MODE=false"
```
如果 `CDP_MODE=true`：告知用户"不需要 — 你已通过 CDP 连接到真实浏览器。你的 Cookie 和会话已经可用。"然后停止。不需要导入 Cookie。

## 工作原理

1. 找到 browse 二进制文件
2. 运行 `cookie-import-browser` 检测已安装的浏览器并打开选择器 UI
3. 用户在浏览器中选择要导入哪些 Cookie 域名
4. Cookie 被解密并加载到 Playwright 会话中

## 步骤

### 1. 找到 browse 二进制文件

## 设置（在任何 browse 命令之前运行此检查）

```bash
_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
B=""
[ -n "$_ROOT" ] && [ -x "$_ROOT/.trae/skills/gstack/browse/dist/browse" ] && B="$_ROOT/.trae/skills/gstack/browse/dist/browse"
[ -z "$B" ] && B="$HOME/.trae/skills/gstack/browse/dist/browse"
if [ -x "$B" ]; then
  echo "READY: $B"
else
  echo "NEEDS_SETUP"
fi
```

如果输出 `NEEDS_SETUP`：
1. 告知用户："gstack browse 需要一次性构建（约 10 秒）。可以继续吗？"然后 STOP 并等待。
2. 运行：`cd <SKILL_DIR> && ./setup`
3. 如果 `bun` 未安装：
   ```bash
   if ! command -v bun >/dev/null 2>&1; then
     BUN_VERSION="1.3.10"
     BUN_INSTALL_SHA="bab8acfb046aac8c72407bdcce903957665d655d7acaa3e11c7c4616beae68dd"
     tmpfile=$(mktemp)
     curl -fsSL "https://bun.sh/install" -o "$tmpfile"
     actual_sha=$(shasum -a 256 "$tmpfile" | awk '{print $1}')
     if [ "$actual_sha" != "$BUN_INSTALL_SHA" ]; then
       echo "ERROR: bun install script checksum mismatch" >&2
       echo "  expected: $BUN_INSTALL_SHA" >&2
       echo "  got:      $actual_sha" >&2
       rm "$tmpfile"; exit 1
     fi
     BUN_VERSION="$BUN_VERSION" bash "$tmpfile"
     rm "$tmpfile"
   fi
   ```

### 2. 打开 Cookie 选择器

```bash
$B cookie-import-browser
```

这会自动检测已安装的 Chromium 浏览器并在你的默认浏览器中打开一个交互式选择器 UI，你可以：
- 在已安装的浏览器之间切换
- 搜索域名
- 点击 "+" 导入某个域名的 Cookie
- 点击垃圾桶删除已导入的 Cookie

告知用户：**"Cookie 选择器已打开 — 在浏览器中选择你想导入的域名，完成后告诉我。"**

### 3. 直接导入（备选方案）

如果用户直接指定了域名（例如 `/setup-browser-cookies github.com`），跳过 UI：

```bash
$B cookie-import-browser comet --domain github.com
```

将 `comet` 替换为指定的浏览器（如果有）。

### 4. 验证

在用户确认完成后：

```bash
$B cookies
```

向用户展示已导入 Cookie 的摘要（按域名统计数量）。

## 注意事项

- 在 macOS 上，每个浏览器的首次导入可能会触发钥匙串对话框 — 点击"允许"/"始终允许"
- 在 Linux 上，`v11` Cookie 可能需要 `secret-tool`/libsecret 访问权限；`v10` Cookie 使用 Chromium 的标准回退密钥
- Cookie 选择器在与浏览服务器相同的端口上提供服务（无需额外进程）
- UI 中仅显示域名和 Cookie 数量 — 不暴露 Cookie 值
- 浏览会话在命令之间持久化 Cookie，因此导入的 Cookie 会立即生效
