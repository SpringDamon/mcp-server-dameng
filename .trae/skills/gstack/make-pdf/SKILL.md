---
name: make-pdf
preamble-tier: 1
version: 1.0.0
description: |
  将任意 Markdown 文件转换为出版级质量的 PDF。标准的 1 英寸页边距、
  智能分页、页码、封面页、页眉、弯引号和破折号、可点击的目录、对角线
  DRAFT 草稿水印。不是草稿产物——而是完成的作品。当被要求"制作 PDF"、
  "导出为 PDF"、"将此 Markdown 转为 PDF"或"生成文档"时使用。(gstack)
  语音触发（语音转文本别名）："make this a pdf"、"make it a pdf"、"export to pdf"、"turn this into a pdf"、"turn this markdown into a pdf"、"generate a pdf"、"make a pdf from"、"pdf this markdown"。
triggers:
  - markdown to pdf
  - generate pdf
  - make pdf
  - export pdf
allowed-tools:
  - Bash
  - Read
  - AskUserQuestion
---
<!-- 由 SKILL.md.tmpl 自动生成 — 请勿直接编辑 -->
<!-- 重新生成：bun run gen:skill-docs -->

## 前置步骤（首先运行）

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
echo '{"skill":"make-pdf","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> ~/.gstack/analytics/skill-usage.jsonl 2>/dev/null || true
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
.trae/skills/gstack/bin/gstack-timeline-log '{"skill":"make-pdf","event":"started","branch":"'"$_BRANCH"'","session":"'"$_SESSION_ID"'"}' 2>/dev/null &
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

## 计划模式下的安全操作

在计划模式下，以下操作被允许，因为它们有助于制定计划：`$B`、`$D`、`codex exec`/`codex review`、写入 `~/.gstack/`、写入计划文件，以及使用 `open` 打开生成的产物。

## 计划模式下的技能调用

如果用户在计划模式下调用技能，技能优先于通用计划模式行为。**将技能文件视为可执行指令，而非参考资料。** 从步骤 0 开始逐步执行；第一个 AskUserQuestion 表示工作流进入计划模式，并非违反计划模式。AskUserQuestion 满足计划模式的回合结束要求。在 STOP 点，立即停止。不要继续工作流或调用 ExitPlanMode。标记为"计划模式例外 — 始终运行"的命令将执行。仅在技能工作流完成后，或用户要求取消技能或离开计划模式时，才调用 ExitPlanMode。

如果 `PROACTIVE` 为 `"false"`，不要自动调用或主动推荐技能。如果某个技能看起来有用，询问："我认为 /skillname 可能对此有帮助——要运行它吗？"

如果 `SKILL_PREFIX` 为 `"true"`，建议使用/调用 `/gstack-*` 名称。磁盘路径保持 `.trae/skills/gstack/[skill-name]/SKILL.md`。

如果输出显示 `UPGRADE_AVAILABLE <旧版本> <新版本>`：读取 `.trae/skills/gstack/gstack-upgrade/SKILL.md` 并遵循"内联升级流程"（如果配置了则自动升级，否则使用 AskUserQuestion 提供 4 个选项，如果拒绝则写入延迟状态）。

如果输出显示 `JUST_UPGRADED <from> <to>`：打印 "Running gstack v{to} (just updated!)"。如果 `SPAWNED_SESSION` 为 true，跳过功能发现。

功能发现，每会话最多一次提示：
- 缺少 `.trae/skills/gstack/.feature-prompted-continuous-checkpoint`：使用 AskUserQuestion 询问持续检查点自动提交。如果接受，运行 `.trae/skills/gstack/bin/gstack-config set checkpoint_mode continuous`。始终触碰标记文件。
- 缺少 `.trae/skills/gstack/.feature-prompted-model-overlay`：告知"模型覆盖已激活。MODEL_OVERLAY 显示补丁。"始终触碰标记文件。

升级提示后，继续工作流。

如果 `WRITING_STYLE_PENDING` 为 `yes`：询问一次写作风格：

> v1 提示更简洁：首次使用的术语注释、以结果为导向的问题、更简短的散文。保持默认或恢复简洁？

选项：
- A) 保持新默认值（推荐 — 好的写作对所有人都有帮助）
- B) 恢复 V0 风格 — 设置 `explain_level: terse`

如果选择 A：保持 `explain_level` 未设置（默认为 `default`）。
如果选择 B：运行 `.trae/skills/gstack/bin/gstack-config set explain_level terse`。

无论选择什么都必须运行：
```bash
rm -f ~/.gstack/.writing-style-prompt-pending
touch ~/.gstack/.writing-style-prompted
```

如果 `WRITING_STYLE_PENDING` 为 `no`，跳过此步骤。

如果 `LAKE_INTRO` 为 `no`：说明"gstack 遵循**煮湖**原则——当 AI 使边际成本接近零时，做完整的事情。了解更多：https://garryslist.org/posts/boil-the-ocean" 询问是否打开：

```bash
open https://garryslist.org/posts/boil-the-ocean
touch ~/.gstack/.completeness-intro-seen
```

仅在用户同意时运行 `open`。始终运行 `touch`。

如果 `TEL_PROMPTED` 为 `no` 且 `LAKE_INTRO` 为 `yes`：通过 AskUserQuestion 询问一次遥测：

> 帮助 gstack 变得更好。仅共享使用数据：技能、持续时间、崩溃、稳定设备 ID。不包含代码、文件路径或仓库名称。

选项：
- A) 帮助 gstack 变得更好！（推荐）
- B) 不用了

如果选择 A：运行 `.trae/skills/gstack/bin/gstack-config set telemetry community`

如果选择 B：追问：

> 匿名模式仅发送汇总使用情况，不包含唯一 ID。

选项：
- A) 可以，匿名就行
- B) 不用了，完全关闭

如果 B→A：运行 `.trae/skills/gstack/bin/gstack-config set telemetry anonymous`
如果 B→B：运行 `.trae/skills/gstack/bin/gstack-config set telemetry off`

始终运行：
```bash
touch ~/.gstack/.telemetry-prompted
```

如果 `TEL_PROMPTED` 为 `yes`，跳过此步骤。

如果 `PROACTIVE_PROMPTED` 为 `no` 且 `TEL_PROMPTED` 为 `yes`：询问一次：

> 让 gstack 主动推荐技能，例如对"这能工作吗？"使用 /qa，或对 bug 使用 /investigate？

选项：
- A) 保持开启（推荐）
- B) 关闭 — 我自己输入 /命令

如果选择 A：运行 `.trae/skills/gstack/bin/gstack-config set proactive true`
如果选择 B：运行 `.trae/skills/gstack/bin/gstack-config set proactive false`

始终运行：
```bash
touch ~/.gstack/.proactive-prompted
```

如果 `PROACTIVE_PROMPTED` 为 `yes`，跳过此步骤。

如果 `HAS_ROUTING` 为 `no` 且 `ROUTING_DECLINED` 为 `false` 且 `PROACTIVE_PROMPTED` 为 `yes`：
检查项目根目录是否存在 CLAUDE.md 文件。如果不存在，创建它。

使用 AskUserQuestion：

> 当项目的 CLAUDE.md 包含技能路由规则时，gstack 效果最佳。

选项：
- A) 将路由规则添加到 CLAUDE.md（推荐）
- B) 不用了，我会手动调用技能

如果选择 A：将此部分追加到 CLAUDE.md 末尾：

```markdown

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
```

然后提交更改：`git add CLAUDE.md && git commit -m "chore: add gstack skill routing rules to CLAUDE.md"`

如果选择 B：运行 `.trae/skills/gstack/bin/gstack-config set routing_declined true` 并告知他们可以通过 `gstack-config set routing_declined false` 重新启用。

每个项目仅发生一次。如果 `HAS_ROUTING` 为 `yes` 或 `ROUTING_DECLINED` 为 `true`，跳过此步骤。

如果 `VENDORED_GSTACK` 为 `yes`，通过 AskUserQuestion 警告一次，除非 `~/.gstack/.vendoring-warned-$SLUG` 存在：

> 此项目在 `.trae/skills/gstack/` 中内嵌了 gstack。内嵌已被弃用。
> 迁移到团队模式？

选项：
- A) 是的，立即迁移到团队模式
- B) 不，我自己处理

如果选择 A：
1. 运行 `git rm -r .trae/skills/gstack/`
2. 运行 `echo '.trae/skills/gstack/' >> .gitignore`
3. 运行 `.trae/skills/gstack/bin/gstack-team-init required`（或 `optional`）
4. 运行 `git add .claude/ .gitignore CLAUDE.md && git commit -m "chore: migrate gstack from vendored to team mode"`
5. 告知用户："完成。每个开发者现在运行：`cd .trae/skills/gstack && ./setup --team`"

如果选择 B：告知"好的，您需要自行维护内嵌副本的更新。"

无论选择什么都必须运行：
```bash
eval "$(.trae/skills/gstack/bin/gstack-slug 2>/dev/null)" 2>/dev/null || true
touch ~/.gstack/.vendoring-warned-${SLUG:-unknown}
```

如果标记文件存在，跳过。

如果 `SPAWNED_SESSION` 为 `"true"`，您正在 AI 编排器（例如 OpenClaw）生成的会话中运行。在生成的会话中：
- 不要使用 AskUserQuestion 进行交互式提示。自动选择推荐选项。
- 不要运行升级检查、遥测提示、路由注入或 lake intro。
- 专注于完成任务并通过散文输出报告结果。
- 以完成报告结束：发布了什么、做出的决定、任何不确定的事项。

## GBrain 同步（技能启动）

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

隐私停止门：如果输出显示 `BRAIN_SYNC: off`、`gbrain_sync_mode_prompted` 为 `false`，且 gbrain 在 PATH 中或 `gbrain doctor --fast --json` 可用，询问一次：

> gstack 可以将您的会话记忆发布到一个私有 GitHub 仓库，GBrain 会在多台机器上索引它。应该同步多少内容？

选项：
- A) 所有允许列表的内容（推荐）
- B) 仅产物
- C) 拒绝，所有内容保留在本地

回答后：

```bash
# 选择的模式：full | artifacts-only | off
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

以下调整针对 claude 模型家族进行了优化。它们**从属于**技能工作流、STOP 点、AskUserQuestion 门控、计划模式安全性和 /ship 审查门控。如果以下调整与技能指令冲突，以技能为准。将这些视为偏好，而非规则。

**待办列表纪律。** 在执行多步骤计划时，每完成一个任务就单独标记为完成。不要在最后批量完成。如果某个任务被发现是不必要的，标记为跳过并附一行原因。

**在执行重大操作前先思考。** 对于复杂操作（重构、迁移、重要的新功能），在执行前简要说明您的方法。这可以让用户低成本地纠正方向，而不是在执行中途。

**使用专用工具而非 Bash。** 优先使用 Read、Edit、Write、Glob、Grep 而非等效的 shell 命令（cat、sed、find、grep）。专用工具更便宜、更清晰。

## 语音风格

直接、具体，构建者对构建者。指出文件名、函数名、命令和用户可见的影响。没有填充内容。

不使用破折号。不使用 AI 词汇：delve、crucial、robust、comprehensive、nuanced、multifaceted。永远不要使用企业或学术风格。简短段落。以要做的事情结尾。

用户拥有您不知道的上下文。跨模型的一致意见是建议，而非决定。由用户决定。

## 完成状态协议

在完成技能工作流时，使用以下之一报告状态：
- **DONE** — 已完成并提供证据。
- **DONE_WITH_CONCERNS** — 已完成，但列出顾虑。
- **BLOCKED** — 无法继续；说明阻塞点和已尝试的操作。
- **NEEDS_CONTEXT** — 缺少信息；准确说明需要什么。

在 3 次尝试失败后、不确定的安全敏感更改或无法验证的范围时升级。格式：`STATUS`、`REASON`、`ATTEMPTED`、`RECOMMENDATION`。

## 操作自我改进

在完成之前，如果您发现了一个可靠的项目特性或命令修复，下次可以节省 5 分钟以上，记录它：

```bash
.trae/skills/gstack/bin/gstack-learnings-log '{"skill":"SKILL_NAME","type":"operational","key":"SHORT_KEY","insight":"DESCRIPTION","confidence":N,"source":"observed"}'
```

不要记录显而易见的事实或一次性瞬态错误。

## 遥测（最后运行）

工作流完成后，记录遥测。使用 frontmatter 中的技能 `name:`。OUTCOME 为 success/error/abort/unknown。

**计划模式例外 — 始终运行：** 此命令将遥测写入
`~/.gstack/analytics/`，与前置遥测写入匹配。

运行此 bash：

```bash
_TEL_END=$(date +%s)
_TEL_DUR=$(( _TEL_END - _TEL_START ))
rm -f ~/.gstack/analytics/.pending-"$_SESSION_ID" 2>/dev/null || true
# 会话时间线：记录技能完成（仅限本地，绝不发送）
.trae/skills/gstack/bin/gstack-timeline-log '{"skill":"SKILL_NAME","event":"completed","branch":"'$(git branch --show-current 2>/dev/null || echo unknown)'","outcome":"OUTCOME","duration_s":"'"$_TEL_DUR"'","session":"'"$_SESSION_ID"'"}' 2>/dev/null || true
# 本地分析（受遥测设置控制）
if [ "$_TEL" != "off" ]; then
echo '{"skill":"SKILL_NAME","duration_s":"'"$_TEL_DUR"'","outcome":"OUTCOME","browse":"USED_BROWSE","session":"'"$_SESSION_ID"'","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' >> ~/.gstack/analytics/skill-usage.jsonl 2>/dev/null || true
fi
# 远程遥测（需选择加入，需要二进制文件）
if [ "$_TEL" != "off" ] && [ -x .trae/skills/gstack/bin/gstack-telemetry-log ]; then
  .trae/skills/gstack/bin/gstack-telemetry-log \
    --skill "SKILL_NAME" --duration "$_TEL_DUR" --outcome "OUTCOME" \
    --used-browse "USED_BROWSE" --session-id "$_SESSION_ID" 2>/dev/null &
fi
```

运行前替换 `SKILL_NAME`、`OUTCOME` 和 `USED_BROWSE`。

## 计划状态页脚

在 ExitPlanMode 之前的计划模式下：如果计划文件缺少 `## GSTACK REVIEW REPORT`，运行 `.trae/skills/gstack/bin/gstack-review-read` 并追加标准运行/状态/发现表。如果是 `NO_REVIEWS` 或为空，追加一个 5 行的占位符，结论为"NO REVIEWS YET — run `/autoplan`"。如果存在更丰富的报告，跳过。

计划模式例外 — 始终允许（因为是计划文件）。

# make-pdf：从 Markdown 生成出版级 PDF

将 `.md` 文件转换为看起来像 Faber & Faber 散文的 PDF：1 英寸页边距、
左对齐正文、全文 Helvetica 字体、弯引号和破折号、可选封面页和可点击目录、
需要时可添加对角线 DRAFT 草稿水印。从 PDF 复制粘贴会产生干净的文本，
绝不会出现"S a i l i n g"这样的字符分离问题。

在 Linux 上，安装 `fonts-liberation` 以获得正确的渲染效果——默认情况下不存在 Helvetica 和 Arial 字体，
而 Liberation Sans 是标准度量兼容的后备字体。CI 和 Docker 构建会通过 Dockerfile.ci 自动安装它。

## MAKE-PDF 设置（在执行任何 make-pdf 命令前运行此检查）

```bash
_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
P=""
[ -n "$MAKE_PDF_BIN" ] && [ -x "$MAKE_PDF_BIN" ] && P="$MAKE_PDF_BIN"
[ -z "$P" ] && [ -n "$_ROOT" ] && [ -x "$_ROOT/.trae/skills/gstack/make-pdf/dist/pdf" ] && P="$_ROOT/.trae/skills/gstack/make-pdf/dist/pdf"
[ -z "$P" ] && P="$HOME/.trae/skills/gstack/make-pdf/dist/pdf"
if [ -x "$P" ]; then
  echo "MAKE_PDF_READY: $P"
  alias _p_="$P"   # shellcheck 别名助手（未导出）
  export P   # 在同一技能调用的后续代码块中可用作 $P
else
  echo "MAKE_PDF_NOT_AVAILABLE (在 gstack 仓库中运行 './setup' 来构建它)"
fi
```

如果打印 `MAKE_PDF_NOT_AVAILABLE`：告知用户二进制文件尚未构建。
让他们在 gstack 仓库中运行 `./setup`，然后重试。

如果打印 `MAKE_PDF_READY`：`$P` 是技能其余部分的二进制路径。使用 `$P`
（而非显式路径）以保持技能主体的可移植性。

核心命令：
- `$P generate <input.md> [output.pdf]` — 将 Markdown 渲染为 PDF（80% 的使用场景）
- `$P generate --cover --toc essay.md out.pdf` — 完整的出版布局
- `$P generate --watermark DRAFT memo.md draft.pdf` — 对角线 DRAFT 水印
- `$P preview <input.md>` — 渲染 HTML 并在浏览器中打开（快速迭代）
- `$P setup` — 验证浏览 + Chromium + pdftotext 并运行冒烟测试
- `$P --help` — 完整的标志参考

输出约定：
- `stdout`：仅在成功时输出路径。一行。
- `stderr`：进度信息（`Rendering HTML... Generating PDF...`），除非使用 `--quiet`。
- 退出码：0 成功 / 1 参数错误 / 2 渲染错误 / 3 Paged.js 超时 / 4 浏览不可用。

## 核心模式

### 80% 场景 — 备忘录/信件

一个命令，无需标志。默认获得带有运行页眉 + 页码
+ CONFIDENTIAL 页脚的干净 PDF。

```bash
$P generate letter.md                 # 写入 /tmp/letter.pdf
$P generate letter.md letter.pdf      # 显式输出路径
```

### 出版模式 — 封面 + 目录 + 章节分隔

```bash
$P generate --cover --toc --author "Garry Tan" --title "On Horizons" \
  essay.md essay.pdf
```

Markdown 中的每个顶级 H1 标题会开始一个新页面。对于碰巧有多个 H1 的备忘录，
使用 `--no-chapter-breaks` 禁用此行为。

### 草稿阶段水印

```bash
$P generate --watermark DRAFT memo.md draft.pdf
```

每页都有对角线 10% 透明度的 DRAFT 水印。当草稿定稿时，去掉
该标志并重新生成。

### 通过预览快速迭代

```bash
$P preview essay.md
```

使用相同的打印 CSS 渲染 HTML 并在浏览器中打开。编辑 Markdown 时刷新即可。
在准备好之前，跳过 PDF 往返过程。

### 无品牌（无 CONFIDENTIAL 页脚）

```bash
$P generate --no-confidential memo.md memo.pdf
```

## 常用标志

```
页面布局：
  --margins <尺寸>            1in（默认）| 72pt | 2.54cm | 25mm
  --page-size letter|a4|legal

结构：
  --cover                    封面页（标题、作者、日期、发丝线）
  --toc                      可点击的目录，带页码
  --no-chapter-breaks        不在每个 H1 处开始新页面

品牌：
  --watermark <文本>         对角线水印（"DRAFT"、"CONFIDENTIAL"）
  --header-template <html>   自定义运行页眉
  --footer-template <html>   自定义页脚（与 --page-numbers 互斥）
  --no-confidential          隐藏右侧的 CONFIDENTIAL 页脚

输出：
  --page-numbers             "N / M" 页脚（默认开启）
  --tagged                   无障碍 PDF（默认开启）
  --outline                  从标题生成 PDF 书签（默认开启）
  --quiet                    抑制 stderr 上的进度信息
  --verbose                  各阶段耗时

网络：
  --allow-network            获取外部图片。默认关闭
                             （阻止跟踪像素）。

元数据：
  --title "..."              文档标题（默认为第一个 H1）
  --author "..."             封面和 PDF 元数据的作者
  --date "..."               封面日期（默认为今天）
```

## Claude 何时应该运行它

留意将 Markdown 转换为 PDF 的意图。以下任何模式 → 运行 `$P generate`：

- "你能把这个 Markdown 转成 PDF 吗"
- "导出为 PDF"
- "把这封信转成 PDF"
- "我需要这篇论文的 PDF"
- "帮我打印成 PDF"

如果用户打开了一个 `.md` 文件并说"让它好看点"，提议
`$P generate --cover --toc` 并在运行前询问。

## 调试

- 输出看起来是空的/空白的 → 检查浏览守护进程是否运行：`$B status`。
- 复制粘贴时文本碎片化 → highlight.js 输出（第 4 阶段）。在该标志存在后，
  使用 `--no-syntax` 重试。目前，删除代码围栏块并重新生成。
- Paged.js 超时 → 可能 Markdown 中没有标题。去掉 `--toc`。
- 外部图片未显示 → 添加 `--allow-network`（理解您正在授予 Markdown 文件
  从其图片 URL 获取内容的权限）。
- 生成的 PDF 太高/太宽 → 使用 `--page-size a4` 或 `--margins 0.75in`。

## 输出约定

```
stdout: /tmp/letter.pdf          ← 仅路径，一行
stderr: Rendering HTML...        ← 进度指示器（除非使用 --quiet）
        Generating PDF...
        Done in 1.5s. 43 words · 22KB · /tmp/letter.pdf

exit code: 0 成功 / 1 参数错误 / 2 渲染错误 / 3 Paged.js 超时
           / 4 浏览不可用
```

捕获路径：`PDF=$($P generate letter.md)` — 然后使用 `$PDF`。
