---
name: benchmark-models
preamble-tier: 1
version: 1.0.0
description: |
  gstack技能的跨模型基准测试。将同一提示词同时运行于Claude、
  GPT（通过Codex CLI）和Gemini——比较延迟、tokens、成本，
  以及可选的通过LLM评审的质量评估。用数据而非感觉来回答
  "哪个模型实际上最适合这个技能？"。与/benchmark不同，后者
  测量网页性能。使用场景："benchmark models"、"compare models"、
  "which model is best for X"、"cross-model comparison"、"model shootout"。
  (gstack)
  语音触发器（语音转文本别名）："compare models"、"model shootout"、"which model is best"。
triggers:
  - cross model benchmark
  - compare claude gpt gemini
  - benchmark skill across models
  - which model should I use
allowed-tools:
  - Bash
  - Read
  - AskUserQuestion
---
<!-- 从 SKILL.md.tmpl 自动生成 — 请勿直接编辑 -->
<!-- 重新生成：bun run gen:skill-docs -->

## 前置准备（首先运行）

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
echo '{"skill":"benchmark-models","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> ~/.gstack/analytics/skill-usage.jsonl 2>/dev/null || true
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
.trae/skills/gstack/bin/gstack-timeline-log '{"skill":"benchmark-models","event":"started","branch":"'"$_BRANCH"'","session":"'"$_SESSION_ID"'"}' 2>/dev/null &
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

## 计划模式安全操作

在计划模式下，允许执行以下操作，因为它们可以为计划提供信息：`$B`、`$D`、`codex exec`/`codex review`、写入 `~/.gstack/`、写入计划文件，以及对生成的产物执行 `open`。

## 计划模式期间的技能调用

如果用户在计划模式下调用技能，技能优先于通用计划模式行为。**将技能文件视为可执行指令，而非参考资料。** 从步骤0开始逐步执行；第一个AskUserQuestion是工作流进入计划模式的标志，而非违反计划模式。AskUserQuestion满足计划模式的回合结束要求。在STOP点，立即停止。不要继续工作流或在那里调用ExitPlanMode。标记为"计划模式例外 — 始终运行"的命令会执行。仅在工作流完成后，或用户要求取消技能或离开计划模式时，才调用ExitPlanMode。

如果`PROACTIVE`为`"false"`，不要自动调用或主动建议技能。如果有技能看起来有用，询问："我认为/skillname可能对此有帮助—要我运行它吗？"

如果`SKILL_PREFIX`为`"true"`，建议/调用`/gstack-*`名称。磁盘路径保持为`.trae/skills/gstack/[skill-name]/SKILL.md`。

如果输出显示`UPGRADE_AVAILABLE <old> <new>`：读取`.trae/skills/gstack/gstack-upgrade/SKILL.md`并遵循"内联升级流程"（如果配置为自动升级则执行，否则通过AskUserQuestion提供4个选项，如果拒绝则写入延迟状态）。

如果输出显示`JUST_UPGRADED <from> <to>`：打印"正在运行gstack v{to}（刚刚更新！）"。如果`SPAWNED_SESSION`为true，跳过功能发现。

功能发现，每会话最多一次提示：
- 缺少`.trae/skills/gstack/.feature-prompted-continuous-checkpoint`：通过AskUserQuestion询问连续检查点自动提交。如果接受，运行`.trae/skills/gstack/bin/gstack-config set checkpoint_mode continuous`。始终触碰标记文件。
- 缺少`.trae/skills/gstack/.feature-prompted-model-overlay`：告知"模型覆盖层处于活动状态。MODEL_OVERLAY显示补丁。"始终触碰标记文件。

升级提示后，继续工作流。

如果`WRITING_STYLE_PENDING`为`yes`：询问一次关于写作风格的问题：

> v1提示词更简单：首次使用时解释术语、以结果为导向的问题、更简短的叙述。保持默认还是恢复简洁模式？

选项：
- A）保持新的默认值（推荐—好的写作对所有人都有帮助）
- B）恢复V0风格—设置`explain_level: terse`

如果选A：保持`explain_level`未设置（默认为`default`）。
如果选B：运行`.trae/skills/gstack/bin/gstack-config set explain_level terse`。

无论选择什么都要运行：
```bash
rm -f ~/.gstack/.writing-style-prompt-pending
touch ~/.gstack/.writing-style-prompted
```

如果`WRITING_STYLE_PENDING`为`no`则跳过。

如果`LAKE_INTRO`为`no`：说"gstack遵循**Boil the Lake（煮干整个湖）**原则—当AI使边际成本趋近于零时，就做完整的事情。了解更多：https://garryslist.org/posts/boil-the-ocean"提供打开链接：

```bash
open https://garryslist.org/posts/boil-the-ocean
touch ~/.gstack/.completeness-intro-seen
```

仅在用户同意时运行`open`。始终运行`touch`。

如果`TEL_PROMPTED`为`no`且`LAKE_INTRO`为`yes`：通过AskUserQuestion询问一次遥测设置：

> 帮助gstack变得更好。仅共享使用数据：技能、持续时间、崩溃、稳定的设备ID。不包含代码、文件路径或仓库名称。

选项：
- A）帮助gstack变得更好！（推荐）
- B）不了谢谢

如果选A：运行`.trae/skills/gstack/bin/gstack-config set telemetry community`

如果选B：追问：

> 匿名模式仅发送聚合使用数据，不包含唯一ID。

选项：
- A）可以，匿名模式没问题
- B）不了谢谢，完全关闭

如果B→A：运行`.trae/skills/gstack/bin/gstack-config set telemetry anonymous`
如果B→B：运行`.trae/skills/gstack/bin/gstack-config set telemetry off`

始终运行：
```bash
touch ~/.gstack/.telemetry-prompted
```

如果`TEL_PROMPTED`为`yes`则跳过。

如果`PROACTIVE_PROMPTED`为`no`且`TEL_PROMPTED`为`yes`：询问一次：

> 让gstack主动建议技能，比如用/qa检查"这能工作吗？"或用/investigate排查bug？

选项：
- A）保持开启（推荐）
- B）关闭它—我自己输入/命令

如果选A：运行`.trae/skills/gstack/bin/gstack-config set proactive true`
如果选B：运行`.trae/skills/gstack/bin/gstack-config set proactive false`

始终运行：
```bash
touch ~/.gstack/.proactive-prompted
```

如果`PROACTIVE_PROMPTED`为`yes`则跳过。

如果`HAS_ROUTING`为`no`且`ROUTING_DECLINED`为`false`且`PROACTIVE_PROMPTED`为`yes`：
检查项目根目录是否存在CLAUDE.md文件。如果不存在，创建它。

使用AskUserQuestion：

> 当项目的CLAUDE.md包含技能路由规则时，gstack的工作效果最佳。

选项：
- A）将路由规则添加到CLAUDE.md（推荐）
- B）不了谢谢，我会手动调用技能

如果选A：将以下内容追加到CLAUDE.md末尾：

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

如果选B：运行`.trae/skills/gstack/bin/gstack-config set routing_declined true`并告知他们可以通过`gstack-config set routing_declined false`重新启用。

这每个项目只发生一次。如果`HAS_ROUTING`为`yes`或`ROUTING_DECLINED`为`true`则跳过。

如果`VENDORED_GSTACK`为`yes`，除非`~/.gstack/.vendoring-warned-$SLUG`存在，否则通过AskUserQuestion警告一次：

> 此项目在`.trae/skills/gstack/`中内嵌了gstack。内嵌方式已弃用。
> 迁移到团队模式？

选项：
- A）是的，立即迁移到团队模式
- B）不了，我自己处理

如果选A：
1. 运行`git rm -r .trae/skills/gstack/`
2. 运行`echo '.trae/skills/gstack/' >> .gitignore`
3. 运行`.trae/skills/gstack/bin/gstack-team-init required`（或`optional`）
4. 运行`git add .claude/ .gitignore CLAUDE.md && git commit -m "chore: migrate gstack from vendored to team mode"`
5. 告知用户："完成。现在每个开发者运行：`cd .trae/skills/gstack && ./setup --team`"

如果选B：说"好的，你自己负责保持内嵌副本的更新。"

无论选择什么都要运行：
```bash
eval "$(.trae/skills/gstack/bin/gstack-slug 2>/dev/null)" 2>/dev/null || true
touch ~/.gstack/.vendoring-warned-${SLUG:-unknown}
```

如果标记文件存在，则跳过。

如果`SPAWNED_SESSION`为`"true"`，你正在运行于AI编排器（例如OpenClaw）生成的会话中。在生成的会话中：
- 不要使用AskUserQuestion进行交互式提示。自动选择推荐选项。
- 不要运行升级检查、遥测提示、路由注入或lake介绍。
- 专注于完成任务并通过文本输出报告结果。
- 以完成报告结束：发布了什么、做出了哪些决策、任何不确定的事项。

## GBrain同步（技能启动时）

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



隐私停止门控：如果输出显示`BRAIN_SYNC: off`，`gbrain_sync_mode_prompted`为`false`，且gbrain在PATH上或`gbrain doctor --fast --json`能正常工作，询问一次：

> gstack可以将你的会话记忆发布到一个私有GitHub仓库，由GBrain跨机器索引。应该同步多少内容？

选项：
- A）所有允许的内容（推荐）
- B）仅产物文件
- C）拒绝，全部保留在本地

回答后：

```bash
# 选择的模式：full | artifacts-only | off
"$_BRAIN_CONFIG_BIN" set gbrain_sync_mode <choice>
"$_BRAIN_CONFIG_BIN" set gbrain_sync_mode_prompted true
```

如果选A/B且`~/.gstack/.git`不存在，询问是否运行`gstack-brain-init`。不要阻塞技能执行。

在技能结束前、遥测之前：

```bash
".trae/skills/gstack/bin/gstack-brain-sync" --discover-new 2>/dev/null || true
".trae/skills/gstack/bin/gstack-brain-sync" --once 2>/dev/null || true
```


## 模型特定行为补丁（claude）

以下调整针对claude模型家族进行了优化。它们
**从属于**技能工作流、STOP点、AskUserQuestion门控、计划模式
安全规则和/ship评审门控。如果下面的调整与技能指令冲突，
以技能为准。将这些视为偏好，而非规则。

**待办列表纪律。** 在执行多步骤计划时，每完成一个任务就单独标记
完成。不要在最后批量标记。如果发现某个任务不必要，用一行原因标记为跳过。

**执行重要操作前先思考。** 对于复杂操作（重构、迁移、
重要的新功能），在执行前简要说明你的方法。这能让
用户以低成本纠正方向，而不是在操作中途。

**使用专用工具而非Bash。** 优先使用Read、Edit、Write、Glob、Grep而非shell
等效命令（cat、sed、find、grep）。专用工具更便宜、更清晰。

## 语言风格

直接、具体，开发者对开发者。指明文件、函数、命令和用户可见的影响。无废话。

不使用破折号。不使用AI词汇：delve、crucial、robust、comprehensive、nuanced、multifaceted。绝不使用企业或学术腔调。简短段落。以该做什么结束。

用户拥有你不知道的上下文。跨模型一致是建议，而非决策。由用户决定。

## 完成状态协议

在完成技能工作流时，使用以下之一报告状态：
- **DONE** — 已完成并提供证据。
- **DONE_WITH_CONCERNS** — 已完成，但列出顾虑。
- **BLOCKED** — 无法继续；说明阻塞点和已尝试的操作。
- **NEEDS_CONTEXT** — 缺少信息；准确说明需要什么。

在3次尝试失败后、不确定的安全敏感更改、或无法验证范围时升级。格式：`STATUS`、`REASON`、`ATTEMPTED`、`RECOMMENDATION`。

## 操作自我改进

在完成之前，如果你发现了可以节省下次5分钟以上的持久性项目特性或命令修复，记录它：

```bash
.trae/skills/gstack/bin/gstack-learnings-log '{"skill":"SKILL_NAME","type":"operational","key":"SHORT_KEY","insight":"DESCRIPTION","confidence":N,"source":"observed"}'
```

不要记录显而易见的事实或一次性瞬时错误。

## 遥测（最后运行）

工作流完成后，记录遥测数据。使用前置元数据中的技能`name:`。OUTCOME为success/error/abort/unknown。

**计划模式例外 — 始终运行：** 此命令将遥测数据写入
`~/.gstack/analytics/`，与前置元数据分析写入匹配。

运行此bash：

```bash
_TEL_END=$(date +%s)
_TEL_DUR=$(( _TEL_END - _TEL_START ))
rm -f ~/.gstack/analytics/.pending-"$_SESSION_ID" 2>/dev/null || true
# 会话时间线：记录技能完成（仅本地，从不发送到任何地方）
.trae/skills/gstack/bin/gstack-timeline-log '{"skill":"SKILL_NAME","event":"completed","branch":"'$(git branch --show-current 2>/dev/null || echo unknown)'","outcome":"OUTCOME","duration_s":"'"$_TEL_DUR"'","session":"'"$_SESSION_ID"'"}' 2>/dev/null || true
# 本地分析（受遥测设置门控）
if [ "$_TEL" != "off" ]; then
echo '{"skill":"SKILL_NAME","duration_s":"'"$_TEL_DUR"'","outcome":"OUTCOME","browse":"USED_BROWSE","session":"'"$_SESSION_ID"'","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' >> ~/.gstack/analytics/skill-usage.jsonl 2>/dev/null || true
fi
# 远程遥测（选择性加入，需要二进制文件）
if [ "$_TEL" != "off" ] && [ -x .trae/skills/gstack/bin/gstack-telemetry-log ]; then
  .trae/skills/gstack/bin/gstack-telemetry-log \
    --skill "SKILL_NAME" --duration "$_TEL_DUR" --outcome "OUTCOME" \
    --used-browse "USED_BROWSE" --session-id "$_SESSION_ID" 2>/dev/null &
fi
```

运行前替换`SKILL_NAME`、`OUTCOME`和`USED_BROWSE`。

## 计划状态页脚

在计划模式下、ExitPlanMode之前：如果计划文件缺少`## GSTACK REVIEW REPORT`，运行`.trae/skills/gstack/bin/gstack-review-read`并追加标准的运行/状态/发现表格。如果是`NO_REVIEWS`或为空，追加一个5行的占位符，结论为"NO REVIEWS YET — run `/autoplan`"。如果有更丰富的报告，则跳过。

计划模式例外 — 始终允许（因为是计划文件）。

# /benchmark-models — 跨模型技能基准测试

你正在运行`/benchmark-models`工作流。封装了`gstack-model-benchmark`二进制文件，提供交互式流程：选择提示词、确认提供者、预览认证并运行基准测试。

与`/benchmark`不同——该技能测量网页性能（Core Web Vitals、加载时间）。本技能测量AI模型在gstack技能或任意提示词上的性能。

---

## 步骤0：定位二进制文件

```bash
BIN="$HOME/.trae/skills/gstack/bin/gstack-model-benchmark"
[ -x "$BIN" ] || BIN=".trae/skills/gstack/bin/gstack-model-benchmark"
[ -x "$BIN" ] || { echo "ERROR: gstack-model-benchmark not found. Run ./setup in the gstack install dir." >&2; exit 1; }
echo "BIN: $BIN"
```

如果未找到，停止并告知用户重新安装gstack。

---

## 步骤1：选择提示词

使用前置元数据格式调用AskUserQuestion：
- **重新定位：** 当前项目+分支。
- **简化：** "跨模型基准测试将同一提示词运行于2-3个AI模型，并向你展示它们在速度、成本和输出质量上的对比。我们应该使用什么提示词？"
- **推荐：** A，因为针对实际技能进行基准测试能暴露工具使用差异，而不仅仅是原始生成能力。
- **选项：**
  - A）基准测试我的一个gstack技能（下一步我们将选择哪个技能）。完整度：10/10。
  - B）使用内联提示词—在下一次对话中输入。完整度：8/10。
  - C）指向磁盘上的提示词文件—在下一次对话中指定路径。完整度：8/10。

如果选A：列出具有SKILL.md文件的顶级gstack技能（来自`find . -maxdepth 2 -name SKILL.md -not -path './.*'`），通过第二个AskUserQuestion让用户选择一个。使用所选的SKILL.md路径作为提示词文件。

如果选B：让用户输入内联提示词。通过`--prompt "<text>"`原样使用。

如果选C：让用户提供路径。验证文件是否存在。作为位置参数使用。

---

## 步骤2：选择提供者

```bash
"$BIN" --prompt "unused, dry-run" --models claude,gpt,gemini --dry-run
```

显示试运行输出。"Adapter availability"（适配器可用性）部分告诉用户哪些提供者将实际运行（OK）vs跳过（NOT READY—包含修复提示）。

如果全部三个都显示NOT READY：用清晰的消息停止—没有至少一个已认证的提供者就无法运行基准测试。建议运行`claude login`、`codex login`或`gemini login` / `export GOOGLE_API_KEY`。

如果至少一个OK：调用AskUserQuestion：
- **简化：** "应该包含哪些模型？上面的试运行显示了哪些已认证。未认证的将被干净地跳过—它们不会中断批量测试。"
- **推荐：** A（所有已认证的提供者），因为运行尽可能多的模型能提供最丰富的对比。
- **选项：**
  - A）所有已认证的提供者。完整度：10/10。
  - B）仅Claude。完整度：6/10（无跨模型信号—对于单独的claude基准测试，改用/ship的评审）。
  - C）选择两个—在下一次对话中指定。完整度：8/10。

---

## 步骤3：决定是否使用评审器

```bash
[ -n "$ANTHROPIC_API_KEY" ] || grep -q 'ANTHROPIC' "$HOME/.claude/.credentials.json" 2>/dev/null && echo "JUDGE_AVAILABLE" || echo "JUDGE_UNAVAILABLE"
```

如果评审器可用，调用AskUserQuestion：
- **简化：** "质量评审器使用Anthropic的Claude作为评判者，对每个模型的输出进行0-10分的评分。每次运行增加约$0.05。如果你关心输出质量而不仅仅是延迟和成本，建议使用。"
- **推荐：** A—重点在于比较质量，而不仅仅是速度。
- **选项：**
  - A）启用评审器（增加约$0.05）。完整度：10/10。
  - B）跳过评审器—仅测速度/成本/tokens。完整度：7/10。

如果评审器不可用，跳过此问题并省略`--judge`标志。

---

## 步骤4：运行基准测试

根据步骤1、2、3的决定构建命令：

```bash
"$BIN" <prompt-spec> --models <picked-models> [--judge] --output table
```

其中`<prompt-spec>`是`--prompt "<text>"`（步骤1B）、文件路径（步骤1A或1C），`<picked-models>`是来自步骤2的逗号分隔列表。

在输出到达时进行流式显示。这很慢—每个提供者都要完整运行提示词。根据提示词复杂度和是否启用`--judge`，预计需要30秒-5分钟。

---

## 步骤5：解读结果

表格打印后，为用户总结：
- **最快** — 延迟最低的提供者。
- **最便宜** — 成本最低的提供者。
- **最高质量**（如果运行了`--judge`）— 得分最高的提供者。
- **最佳整体** — 使用判断力。如果运行了评审器：质量加权。否则：指出用户需要做出的权衡。

如果任何提供者遇到错误（认证/超时/速率限制），指出并提供修复路径。

---

## 步骤6：提供保存结果的选项

调用AskUserQuestion：
- **简化：** "将此基准测试保存为JSON，以便你可以将未来的运行与之比较？"
- **推荐：** A—随着提供者更新模型，技能性能会发生漂移；保存的基线可以捕获质量回归。
- **选项：**
  - A）保存到`~/.gstack/benchmarks/<date>-<skill-or-prompt-slug>.json`。完整度：10/10。
  - B）仅打印，不保存。完整度：5/10（丢失趋势数据）。

如果选A：用`--output json`重新运行并通过tee输出到带日期的文件。打印路径以便用户可以对比未来的运行。

---

## 重要规则

- **在步骤2的试运行之前，绝不运行真正的基准测试。** 用户需要在消耗API调用之前查看认证状态。
- **绝不硬编码模型名称。** 始终从用户步骤2的选择中传递提供者—二进制文件会处理其余部分。
- **绝不自动包含`--judge`。** 它会产生实际成本；用户必须选择加入。
- **如果零个提供者已认证，停止。** 不要尝试基准测试—它不会产生有用的输出。
- **成本是可见的。** 每次运行都会在表格中显示每个提供者的成本。用户应在下次运行前看到它。
