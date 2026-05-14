---
name: ship
description: 执行代码变更——测试、审查、验证并提交PR。
---

# /ship — 执行代码变更并提交

## 触发条件

**何时调用此技能：**
- "Ship this"（交付这个）
- "Create a PR"（创建PR）
- "提交这段代码"
- 代码已编写完毕，需要测试、审查和创建PR
- 用户要求完成代码的端到端提交流程

## 前置条件

在调用此技能之前：
1. 代码已经编写完成
2. 你处于分支的顶端（没有未提交的WIP工作）

## 工作流

**前置检查：** 如果用户刚刚调用了 `/ship` 但没有代码改动，询问他们想做什么。不要空转。

1. **获取当前状态**
   ```bash
   git status -s
   git remote -v
   eval "$(.trae/skills/gstack/bin/gstack-slug 2>/dev/null)" && echo "SLUG=$SLUG"
   ```

   **检查未提交的变更：**
   如果 `git status -s` 显示未跟踪/已修改/已暂存的文件（未跟踪的 `node_modules/` 等忽略项除外），使用 AskUserQuestion 询问：

   > 你有未提交的变更。你想怎么处理？

   选项：
   - A) 暂存所有变更并提交（推荐）
   - B) 暂存所有变更，但让我审查再提交
   - C) 不提交，继续 /ship（忽略未提交的变更）
   - D) 取消

   - 如果 A：`git add -A`，编写提交消息，`git commit`，然后继续。
   - 如果 B：`git add -A`，编写提交消息，让用户审查/编辑，确认后 `git commit`，然后继续。
   - 如果 C：跳过暂存/提交，继续执行工作流。
   - 如果 D：停止。

   **检查是否已准备好合并：** 如果分支已经与基础分支相同（没有新提交），询问："分支没有新提交——你想更新分支还是提交现有内容？"

   **确定基础分支：** 如果 `git config --get branch.<current>.merge` 存在，使用它。否则使用 `origin/main`，如果不存在则使用 `origin/master`。

   **确定平台：** 如果 `gh` CLI 可用，使用 GitHub 模式。如果 `glab` CLI 可用，使用 GitLab 模式。如果都不可用，打印远程 URL 并告知用户通过 UI 手动创建 PR。

   **获取配置：** 运行 `.trae/skills/gstack/bin/gstack-config get auto_commit_wip checkpoint_mode version_bump_scope`：
   - `version_bump_scope`: `feature` (递增第3位——小版本), `commit` (递增第4位——补丁), `none` (不递增)
   - `auto_commit_wip`: 如果为 true，在 /ship 开始时自动提交所有带有 WIP 前缀的暂存变更
   - `checkpoint_mode`: `continuous` 在 /ship 过程中自动进行 WIP 检查点提交

   如果 `auto_commit_wip` 为 true 且有 WIP 变更：自动运行 `git add -A` && `git commit -m "WIP: autosaved before ship"`。

2. **确定版本**

   读取项目根目录中的 `VERSION` 文件。格式为 `X.Y.Z.W`。使用 `git rev-parse --show-toplevel` 查找仓库根目录。

   根据 `version_bump_scope` 递增版本：
   - **feature**: 递增第3位（Z）。`1.2.3.4` → `1.2.4.0`
   - **commit**: 递增第4位（W）。`1.2.3.4` → `1.2.3.5`
   - **none**: 保持版本不变

   将新版本写入 `VERSION` 文件。

3. **检查队列积压和版本过期**

   使用 `.trae/skills/gstack/bin/gstack-slug` 解析 slug。如果可用，读取 `~/.gstack/projects/$SLUG/last-shipped-version`。

   如果 `last-shipped-version` 存在并且**早于** `VERSION` 文件中的当前版本，这意味着有积压——其他分支已经在当前版本之前合并了，这个分支落后了。

   在继续之前：
   - 打印 `"版本漂移检测到：last-shipped=$last 当前=current。重新基于 origin/<base> 合并。"`
   - 执行变基：`git fetch origin <base>` && `git rebase origin/<base>`
   - 处理冲突（如果有）
   - 将新版本写入 `VERSION`（变基后可能需要重新递增）

   如果 `last-shipped-version` 等于当前版本或不存在，正常继续。

   在推送后（步骤17）写入 `~/.gstack/projects/$SLUG/last-shipped-version`，值为新的版本号。

4. **创建特性分支**

   ```bash
   git checkout -b gstack/<slug>-ship-<type>
   ```

   `<type>` 是变更类型的简短摘要。

5. **运行测试**

   运行项目测试。如果之前已经运行过测试，并且自上次运行以来**没有代码变更**，则跳过。否则重新运行。

6. **运行审查**

   使用技能调用语法触发 `/review`（预交付审查）技能，并将输出捕获到变量中。如果审查发现严重问题，在继续之前停下来讨论。

7. **生成测试覆盖率图**

   如果项目已经有测试覆盖率工具，则跳过此步骤。否则，为**新增或修改的代码路径**生成测试。

   **注意：** 不要将此与"运行测试"（步骤5）混淆。这一步是**生成覆盖率测试**——确保所有新代码路径都有测试覆盖。

   - 读取 `.gstack/code-coverage-report.txt`（如果存在）以获取之前的覆盖率数据
   - 识别新增或修改的代码路径
   - 为所有未覆盖的路径编写测试
   - 使用项目现有的测试框架
   - 运行测试覆盖率工具并生成报告
   - 在覆盖率图中显示之前的覆盖率和之后的覆盖率
   - 如果项目使用 Jest/Vitest，运行带有 `--coverage` 的测试
   - 如果项目使用 pytest，运行带有 `--cov` 的 pytest
   - 如果项目使用 Rails Minitest，使用 simplecov 并报告覆盖率
   - 保存报告以供 PR 文档使用

   **如果无法确定覆盖率**（没有覆盖率工具，无法安装）：打印 `"覆盖率图：无法确定"` 并继续。

   **防御性：** 如果测试生成因任何原因失败，打印警告并继续。不要因为测试生成失败而阻止 /ship。

8. **计划完成和验证**

   **8.0 计划完成**

   如果存在 `AGENTS.md` 或 `.agent/plan.md`（或任何包含计划项的已知计划文件）：

   1. 读取计划文件并提取所有计划项
   2. 根据 `git diff` 和提交历史检查每个计划项的状态：
      - **DONE** — 已实现并包含在此 PR 中
      - **CHANGED** — 实现但与原始计划不同
      - **DEFERRED** — 未实现（说明原因）
   3. 打印完成摘要：`"计划完成：N/M 项已完成"`
   4. 如果有 DEFERRED 项，列出它们："延后项：item1（原因），item2（原因），..."
   5. **在 PR 正文中包含计划完成摘要**（步骤19）

   **8.1 验证**

   如果计划文件包含**验证**部分（用户指定的验收标准）：

   1. 提取验证项（标记为"验证"、"测试"、"验收"的项）
   2. 自动验证：
      - 检查特定函数/端点是否存在
      - 运行命令并检查输出/退出代码
      - 检查文件/路由/配置是否存在
   3. 如果服务器需要，启动开发服务器并通过 curl 验证
   4. 打印验证结果：`"验证：N 通过，M 失败，K 跳过"`
   5. 如果有失败项，打印每个失败项及其原因
   6. **在 PR 正文中包含验证结果**（步骤19）

9. **预交付审查**

   使用技能调用语法触发 `/review`（预交付审查）技能，并将输出捕获到变量中。如果审查发现严重问题，在继续之前停下来讨论。

10. **Greptile 审查**

    **检查 PR 是否存在：**
    - **GitHub:** `gh pr view --json url,state 2>/dev/null`
    - **GitLab:** `glab mr view -F json 2>/dev/null | jq -r '.state' 2>/dev/null`

    如果 PR/MR 存在且已打开：从 Greptile 获取评论（`.trae/skills/gstack/bin/greptile-review.sh get <PR_URL>`），读取 `.trae/skills/gstack/greptile-triage.md`，并使用该文件的回复模板回复每个评论。

    如果 PR 不存在：**跳过此步骤**。在步骤19创建 PR 后输出 "没有 PR——跳过 Greptile 审查。在 PR 创建后运行 'greptile-review.sh get <PR_URL>'"。

    **防御性：** 如果 Greptile API 调用失败或没有评论，打印 `"Greptile 审查：无评论"` 并继续。

11. **范围漂移检测**

    **仅在分支包含 AI 生成的代码时运行**——检查提交消息中的 co-author 签名、`[AI-Generated]` 标记或 `AGENTS.md` 是否存在。如果都没有，跳过此步骤。

    检查 AI 生成的代码是否超出了请求的范围。如果检测到任何这些情况，打印 `"⚠️ 范围漂移：发现 <problem>"`，询问用户是否继续，如果用户说是则继续：
    - **范围蔓延：** 代码实现了未请求的功能
    - **脚手架/样板代码：** 生成了通用脚手架，而不是具体的实现
    - **占位符 TODO：** 带有"TODO: 实现这个"、"TODO: 添加验证"的存根——在继续之前修复
    - **未使用的依赖：** 添加了但未使用的导入/包

    **如果没有范围问题：** 打印 `"范围检查：干净"` 并继续。

12. **版本 bump 确认（仅 MINOR/MAJOR）**

    如果版本递增是 MINOR 或 MAJOR（`version_bump_scope` 不是 `commit`），通过 AskUserQuestion 确认：
    - 消息：`"版本将从 $OLD_VERSION 变为 $NEW_VERSION。继续？"`
    - 选项：A) 继续，B) 取消

    如果用户取消，停止。否则继续。

    对于 PATCH 级别的递增（`version_bump_scope: commit`），无需确认——自动继续。

13. **编写 CHANGELOG**

    **防御性：** 如果 `git log` 为空或没有新提交，打印 `"CHANGELOG：没有新提交——跳过"` 并继续。

    1. **查找 CHANGELOG 文件：** 查找 `CHANGELOG.md` 或 `CHANGELOG.rst`（按此顺序）。如果都不存在，创建 `CHANGELOG.md`，并使用以下标题初始化它：

    ```markdown
    # 变更日志

    本项目的所有重要更改都将记录在此文件中。

    格式基于 [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)。
    ```

    2. **获取新提交：**
       ```bash
       git fetch origin <base>
       git log origin/<base>..HEAD --oneline
       ```

    3. **获取完整 diff：**
       ```bash
       git diff origin/<base>...HEAD
       ```

    4. **获取上次版本：** 从 CHANGELOG 中提取最后一个版本号。

    5. **编写 CHANGELOG 条目：** 使用完整 diff 和提交历史编写简洁的变更日志条目：
       - 将更改归类为：
         - `### Added` — 新功能
         - `### Changed` — 现有功能的更改
         - `### Deprecated` — 即将移除的功能
         - `### Fixed` — 修复 bug
         - `### Removed` — 移除的功能
       - 编写简洁、描述性的要点
       - 插入文件标题之后（第5行），日期为今天
       - 格式：`## [X.Y.Z.W] - YYYY-MM-DD`
       - **语气：** 以用户现在**能做**什么开头，而不是以前不能做的。使用通俗语言，而不是实现细节。永远不要提及 TODOS.md、内部跟踪或面向贡献者的细节。

    6. **交叉检查：** 将你的 CHANGELOG 条目与步骤2的提交列表进行比较。
       每个提交必须至少对应一个要点。如果分支有 N 个提交跨越 K 个主题，CHANGELOG 必须反映所有 K 个主题。

    **不要让用户描述变更。** 从 diff 和提交历史中推断。

---

## 步骤 14：TODOS.md（自动更新）

根据正在交付的变更交叉引用项目的 TODOS.md。自动标记已完成的项目；仅在文件缺失或混乱时才提示。

阅读 `.claude/skills/review/TODOS-format.md` 获取标准格式参考。

**1. 检查 TODOS.md 是否存在**于仓库根目录。

**如果 TODOS.md 不存在：** 使用 AskUserQuestion：
- 消息："GStack 建议维护一个按技能/组件分组的 TODOS.md，然后按优先级排列（P0 在顶部到 P4，已完成在底部）。完整格式见 TODOS-format.md。你想创建一个吗？"
- 选项：A) 现在创建，B) 暂时跳过
- 如果 A：创建 `TODOS.md`，包含骨架（# TODOS 标题 + ## Completed 部分）。继续到步骤3。
- 如果 B：跳过步骤14的其余部分。继续到步骤15。

**2. 检查结构和组织：**

读取 TODOS.md 并验证其是否遵循推荐的结构：
- 项目按 `## <技能/组件>` 标题分组
- 每个项目有 `**Priority:**` 字段，值为 P0-P4
- 底部有 `## Completed` 部分

**如果结构混乱**（缺少优先级字段、没有组件分组、没有 Completed 部分）：使用 AskUserQuestion：
- 消息："TODOS.md 不遵循推荐的结构（技能/组件分组、P0-P4 优先级、Completed 部分）。你想重新组织它吗？"
- 选项：A) 现在重组（推荐），B) 保持原样
- 如果 A：按照 TODOS-format.md 进行就地重组。保留所有内容——只重组，从不删除项目。
- 如果 B：继续到步骤3，不进行重组。

**3. 检测已完成的 TODO：**

这一步是完全自动的——无需用户交互。

使用之前步骤中收集的 diff 和提交历史：
- `git diff <base>...HEAD`（针对基础分支的完整 diff）
- `git log <base>..HEAD --oneline`（正在交付的所有提交）

对于每个 TODO 项目，通过以下方式检查此 PR 中的变更是否完成了它：
- 将提交消息与 TODO 标题和描述进行匹配
- 检查 TODO 中引用的文件是否出现在 diff 中
- 检查 TODO 描述的工作是否与功能变更匹配

**保持保守：** 只有在 diff 中有明确证据时才标记 TODO 为已完成。如果不确定，不要动。

**4. 移动已完成的项目**到底部的 `## Completed` 部分。追加：`**Completed:** vX.Y.Z (YYYY-MM-DD)`

**5. 输出摘要：**
- `TODOS.md：N 个项目标记为已完成（item1, item2, ...）。M 个项目剩余。`
- 或：`TODOS.md：未检测到已完成的项目。M 个项目剩余。`
- 或：`TODOS.md：已创建。` / `TODOS.md：已重组。`

**6. 防御性：** 如果无法写入 TODOS.md（权限错误、磁盘已满），警告用户并继续。永远不要因为 TODOS 失败而阻止 ship 工作流。

保存此摘要——它将放入步骤19的 PR 正文中。

---

## 步骤 15：提交（可二分查找的块）

### 步骤 15.0：WIP 提交压缩（仅连续检查点模式）

如果 `CHECKPOINT_MODE` 为 `"continuous"`，分支可能包含来自自动检查点的 `WIP:` 提交。这些必须在步骤15.1的二分查找分组逻辑之前压缩到对应的逻辑提交中。分支上的非 WIP 提交（之前已交付的工作）必须保留。

**检测：**
```bash
WIP_COUNT=$(git log <base>..HEAD --oneline --grep="^WIP:" 2>/dev/null | wc -l | tr -d ' ')
echo "WIP_COMMITS: $WIP_COUNT"
```

如果 `WIP_COUNT` 为 0：完全跳过此子步骤。

如果 `WIP_COUNT` > 0，先收集 WIP 上下文以便在压缩后保留：

```bash
# 导出此分支上所有 WIP 提交的 [gstack-context] 块。
# 此文件将作为 CHANGELOG 条目的输入，并可能为 PR 正文上下文提供信息。
mkdir -p "$(git rev-parse --show-toplevel)/.gstack"
git log <base>..HEAD --grep="^WIP:" --format="%H%n%B%n---END---" > \
  "$(git rev-parse --show-toplevel)/.gstack/wip-context-before-squash.md" 2>/dev/null || true
```

**非破坏性压缩策略：**

`git reset --soft <merge-base>` **会**取消所有内容，包括非 WIP 提交。
**不要这样做。** 相反，使用 `git rebase` 仅过滤 WIP 提交。

选项1（首选，如果混合有非 WIP 提交）：
```bash
# 交互式变基，自动压缩 WIP 提交。
# 将每个 WIP 提交标记为 'fixup'（丢弃其消息，将变更折叠到前一个提交中）。
git rebase -i $(git merge-base HEAD origin/<base>) \
  --exec 'true' \
  -X ours 2>/dev/null || {
    echo "Rebase conflict. Aborting: git rebase --abort"
    git rebase --abort
    echo "STATUS: BLOCKED — 需要手动压缩 WIP"
    exit 1
  }
```

选项2（更简单，如果分支目前**全部是** WIP 提交——没有已交付的工作）：
```bash
# 分支仅包含 WIP 提交。这里可以安全地 reset-soft，因为
# 没有需要保留的非 WIP 内容。先验证。
NON_WIP=$(git log <base>..HEAD --oneline --invert-grep --grep="^WIP:" 2>/dev/null | wc -l | tr -d ' ')
if [ "$NON_WIP" -eq 0 ]; then
  git reset --soft $(git merge-base HEAD origin/<base>)
  echo "WIP-only branch, reset-soft to merge base. Step 15.1 will create clean commits."
fi
```

在运行时决定适用哪个选项。如果不确定，优先停止并通过 AskUserQuestion 询问用户，而不是销毁非 WIP 提交。

**防误操作规则：**
- 如果有非 WIP 提交，**永远不要**盲目使用 `git reset --soft`。Codex 已标记这是破坏性的——它会取消已交付的实际工作，并将推送步骤变成对已推送者的非快进推送。
- 只有在 WIP 提交成功压缩/吸收后，或分支已验证仅包含 WIP 工作后，才能继续到步骤15.1。

### 步骤 15.1：可二分查找的提交

**目标：** 创建小而逻辑清晰的提交，以便与 `git bisect` 配合使用，并帮助 LLM 理解变更内容。

1. 分析 diff 并将变更分组到逻辑提交中。每个提交应代表**一个连贯的变更**——不是一个文件，而是一个逻辑单元。

2. **提交顺序**（先提交靠前的）：
   - **基础设施：** 迁移、配置变更、路由添加
   - **模型和服务：** 新模型、服务、关注点（及其测试）
   - **控制器和视图：** 控制器、视图、JS/React 组件（及其测试）
   - **VERSION + CHANGELOG + TODOS.md：** 始终在最后一个提交中

3. **拆分规则：**
   - 模型及其测试文件放在同一个提交中
   - 服务及其测试文件放在同一个提交中
   - 控制器、视图及其测试放在同一个提交中
   - 迁移单独作为一个提交（或与其支持的模型分组）
   - 配置/路由变更可以与其启用的功能分组
   - 如果总 diff 很小（< 50 行，跨越 < 4 个文件），单个提交即可

4. **每个提交必须是独立有效的**——没有损坏的导入，没有引用尚不存在的代码。按依赖顺序排列提交，依赖项先提交。

5. 编写每个提交消息：
   - 第一行：`<type>: <summary>`（type = feat/fix/chore/refactor/docs）
   - 正文：简要描述此提交包含的内容
   - 只有**最后一个提交**（VERSION + CHANGELOG）获得版本标签和合著者附注：

```bash
git commit -m "$(cat <<'EOF'
chore: bump version and changelog (vX.Y.Z.W)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## 步骤 16：验证门禁

**铁律：没有新鲜验证证据，不得声称完成。**

在推送之前，如果步骤4-6期间代码有变更，重新验证：

1. **测试验证：** 如果在步骤5的测试运行后**有任何代码变更**（从审查发现中修复的变更，CHANGELOG 编辑不算），重新运行测试套件。粘贴新的输出。步骤5的过时输出**不可接受**。

2. **构建验证：** 如果项目有构建步骤，运行它。粘贴输出。

3. **防止合理化：**
   - "现在应该可以工作了" → **运行它**。
   - "我有信心" → 信心不是证据。
   - "我之前已经测试过了" → 从那以后代码有变更。再测试一次。
   - "这是个小改动" → 小改动也会破坏生产环境。

**如果这里测试失败：** 停止。不要推送。修复问题并返回步骤5。

在没有验证的情况下声称完成是欺骗，而不是效率。

---

## 步骤 17：推送

**幂等性检查：** 检查分支是否已经推送且最新。

```bash
git fetch origin <branch-name> 2>/dev/null
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/<branch-name> 2>/dev/null || echo "none")
echo "LOCAL: $LOCAL  REMOTE: $REMOTE"
[ "$LOCAL" = "$REMOTE" ] && echo "ALREADY_PUSHED" || echo "PUSH_NEEDED"
```

如果 `ALREADY_PUSHED`，跳过推送但继续到步骤18。否则使用上游跟踪推送：

```bash
git push -u origin <branch-name>
```

**你还没有完成。** 代码已推送，但文档同步和 PR 创建是强制性的最终步骤。继续到步骤18。

---

## 步骤 18：文档同步（通过子代理，在 PR 创建之前）

**将 /document-release 作为子代理分发**，使用 Agent 工具和 `subagent_type: "general-purpose"`。子代理获得全新的上下文窗口——前面17步没有腐化。它还运行**完整**的 `/document-release` 工作流（带有 CHANGELOG 覆盖保护、文档排除、高风险变更门禁、命名暂存），而不是较弱的重新实现。

**顺序：** 此步骤在步骤17（推送）**之后**和步骤19（创建 PR）**之前**运行。PR 从最终的 HEAD 创建一次，`## Documentation` 部分烘焙到初始正文中。不需要创建后重新编辑。

**子代理提示：**

> 你正在代码推送后执行 /document-release 工作流。阅读完整的技能文件 `${HOME}/.trae/skills/gstack/document-release/SKILL.md` 并端到端执行其完整工作流，包括 CHANGELOG 覆盖保护、文档排除、高风险变更门禁和命名暂存。不要尝试编辑 PR 正文——还不存在 PR。分支：`<branch>`，基础：`<base>`。
>
> 完成工作流后，在响应的**最后一行**输出一个 JSON 对象（之后没有其他文本）：
> `{"files_updated":["README.md","CLAUDE.md",...],"commit_sha":"abc1234","pushed":true,"documentation_section":"<用于 PR 正文 ## Documentation 部分的 markdown 块>"}`
>
> 如果没有文档文件需要更新，输出：
> `{"files_updated":[],"commit_sha":null,"pushed":false,"documentation_section":null}`

**父进程处理：**

1. 将子代理响应的最后一行解析为 JSON。
2. 存储 `documentation_section`——步骤19将其嵌入 PR 正文（如果为 null 则省略该部分）。
3. 如果 `files_updated` 非空，打印：`文档同步：{files_updated.length} 个文件已更新，提交为 {commit_sha}`。
4. 如果 `files_updated` 为空，打印：`文档是最新的——无需更新。`

**如果子代理失败或返回无效 JSON：** 打印警告并无 `## Documentation` 部分继续到步骤19。不要因为子代理失败而阻止 /ship。用户可以在 PR 合并后手动运行 `/document-release`。

---

## 步骤 19：创建 PR/MR

**幂等性检查：** 检查此分支是否已存在 PR/MR。

**如果是 GitHub：**
```bash
gh pr view --json url,number,state -q 'if .state == "OPEN" then "PR #\(.number): \(.url)" else "NO_PR" end' 2>/dev/null || echo "NO_PR"
```

**如果是 GitLab：**
```bash
glab mr view -F json 2>/dev/null | jq -r 'if .state == "opened" then "MR_EXISTS" else "NO_MR" end' 2>/dev/null || echo "NO_MR"
```

如果**已打开** PR/MR：**更新** PR 正文，使用 `gh pr edit --body "..."`（GitHub）或 `glab mr update -d "..."`（GitLab）。始终使用本次运行的新鲜结果（测试输出、覆盖率审计、审查发现、对抗性审查、TODOS 摘要、文档部分）从头重新生成 PR 正文。永远不要重复使用之前运行的过期 PR 正文内容。

**同时更新 PR 标题**，如果版本有变更。PR 标题使用工作区感知格式 `v<NEW_VERSION> <type>: <summary>`——版本始终在前。如果当前标题的版本前缀与 `NEW_VERSION` 不匹配，运行 `gh pr edit --title "v$NEW_VERSION <type>: <summary>"`（或 `glab mr update -t ...` 等效命令）。如果步骤12的队列漂移检测重新 bump 了过期版本，这可以保持标题的真实性。如果标题没有 `v<X.Y.Z.W>` 前缀（有意保留的自定义标题），不要动标题——只重写已遵循格式的标题。

打印现有的 URL 并继续到步骤20。

如果没有 PR/MR：使用在步骤0检测到的平台创建拉取请求（GitHub）或合并请求（GitLab）。

PR/MR 正文应包含以下部分：

```
## 摘要
<摘要正在交付的所有变更。运行 `git log <base>..HEAD --oneline` 枚举
每个提交。排除 VERSION/CHANGELOG 元数据提交（那是此 PR 的簿记工作，
不是实质性变更）。将剩余的提交分组到逻辑部分（例如，
"**性能**"、"**死代码移除**"、"**基础设施**"）。每个实质性提交
必须至少出现在一个部分中。如果某个提交的工作没有反映在摘要中，
你漏掉了它。>

## 测试覆盖率
<来自步骤7的覆盖率图，或"所有新代码路径都有测试覆盖。">
<如果运行了步骤7："测试：{before} → {after} (+{delta} 新增)">

## 预交付审查
<来自步骤9代码审查的发现，或"未发现问题。">

## 设计审查
<如果运行了设计审查："设计审查（精简版）：N 个发现——M 个自动修复，K 个跳过。AI 垃圾：干净/N 个问题。">
<如果没有前端文件变更："没有前端文件变更——跳过设计审查。">

## 评估结果
<如果运行了评估：套件名称、通过/失败计数、成本仪表板摘要。如果跳过："没有与提示相关的文件变更——跳过评估。">

## Greptile 审查
<如果找到 Greptile 评论：带有 [FIXED] / [FALSE POSITIVE] / [ALREADY FIXED] 标签的要点列表 + 每个评论一行摘要>
<如果没有 Greptile 评论："没有 Greptile 评论。">
<如果步骤10期间没有 PR：完全省略此部分>

## 范围漂移
<如果运行了范围漂移："范围检查：干净"或列出漂移/蔓延发现>
<如果没有范围漂移：省略此部分>

## 计划完成
<如果找到计划文件：来自步骤8的完成检查清单摘要>
<如果没有计划文件："未检测到计划文件。">
<如果计划项目有延后：列出延后项目>

## 验证结果
<如果运行了验证：来自步骤8.1的摘要（N 通过，M 失败，K 跳过）>
<如果跳过：原因（无计划、无服务器、无验证部分）>
<如果不适用：省略此部分>

## TODOS
<如果标记为完成：带有版本的已完成项目要点列表>
<如果没有项目完成："此 PR 中没有完成 TODOS 项目。">
<如果创建了或重组了 TODOS.md：注明>
<如果 TODOS.md 不存在且用户跳过：省略此部分>

## 文档
<在此处逐字嵌入步骤18子代理返回的 `documentation_section` 字符串。>
<如果步骤18返回 `documentation_section: null`（没有文档更新），完全省略此部分。>

## 测试计划
- [x] 所有 Rails 测试通过（N 次运行，0 失败）
- [x] 所有 Vitest 测试通过（N 个测试）

🤖 使用 [Claude Code](https://claude.com/claude-code) 生成
```

**如果是 GitHub：**

```bash
gh pr create --base <base> --title "v$NEW_VERSION <type>: <summary>" --body "$(cat <<'EOF'
<上述 PR 正文>
EOF
)"
```

**如果是 GitLab：**

```bash
glab mr create -b <base> -t "v$NEW_VERSION <type>: <summary>" -d "$(cat <<'EOF'
<上述 MR 正文>
EOF
)"
```

**如果两个 CLI 都不可用：**
打印分支名称、远程 URL，并指导用户通过 Web UI 手动创建 PR/MR。不要停止——代码已推送并准备就绪。

**输出 PR/MR URL**——然后继续到步骤20。

---

## 步骤 20：持久化 ship 指标

记录覆盖率和计划完成数据，以便 `/retro` 可以跟踪趋势：

```bash
eval "$(.trae/skills/gstack/bin/gstack-slug 2>/dev/null)" && mkdir -p ~/.gstack/projects/$SLUG
```

追加到 `~/.gstack/projects/$SLUG/$BRANCH-reviews.jsonl`：

```bash
echo '{"skill":"ship","timestamp":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","coverage_pct":COVERAGE_PCT,"plan_items_total":PLAN_TOTAL,"plan_items_done":PLAN_DONE,"verification_result":"VERIFY_RESULT","version":"VERSION","branch":"BRANCH"}' >> ~/.gstack/projects/$SLUG/$BRANCH-reviews.jsonl
```

从之前的步骤替换：
- **COVERAGE_PCT**：来自步骤7图的覆盖率百分比（整数，如果无法确定则为 -1）
- **PLAN_TOTAL**：步骤8中提取的计划项目总数（如果没有计划文件则为 0）
- **PLAN_DONE**：步骤8中 DONE + CHANGED 项目的计数（如果没有计划文件则为 0）
- **VERIFY_RESULT**：来自步骤8.1的 "pass"、"fail" 或 "skipped"
- **VERSION**：来自 VERSION 文件
- **BRANCH**：当前分支名称

此步骤是自动的——永远不要跳过它，永远不要请求确认。

---

## 重要规则

- **永远不要跳过测试。** 如果测试失败，停止。
- **永远不要跳过预交付审查。** 如果 checklist.md 无法读取，停止。
- **永远不要强制推送。** 只使用普通的 `git push`。
- **永远不要请求琐碎的确认**（例如，"准备推送吗？"、"创建 PR 吗？"）。**确实需要停止的情况：** 版本 bump（MINOR/MAJOR）、预交付审查发现（ASK 项目）和 Codex 结构化审查 [P1] 发现（仅大型 diff）。
- **始终使用 VERSION 文件中的 4 位版本格式。**
- **CHANGELOG 中的日期格式：** `YYYY-MM-DD`
- **为可二分查找性拆分提交**——每个提交 = 一个逻辑变更。
- **TODOS.md 完成检测必须保守。** 只有在 diff 清楚表明工作已完成时，才将项目标记为已完成。
- **使用 greptile-triage.md 中的 Greptile 回复模板。** 每个回复都包含证据（内联 diff、代码引用、重新排序建议）。永远不要发布模糊的回复。
- **永远不要在没有新鲜验证证据的情况下推送。** 如果在步骤5测试后代码有变更，在推送之前重新运行。
- **步骤7生成覆盖率测试。** 它们必须在提交之前通过。永远不要提交失败的测试。
- **目标是：用户说 `/ship`，接下来他们看到的是审查 + PR URL + 自动同步的文档。**
