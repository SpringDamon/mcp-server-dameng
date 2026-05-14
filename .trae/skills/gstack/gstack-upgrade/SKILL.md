---
name: gstack-upgrade
version: 1.1.0
description: |
  将 gstack 升级到最新版本。检测全局安装与内置安装，
  执行升级并展示新特性。当用户要求"升级 gstack"、
  "更新 gstack"或"获取最新版本"时使用。
  语音触发器（语音识别别名）："升级工具"、"更新工具"、"gee stack 升级"、"g stack 升级"。
triggers:
  - upgrade gstack
  - update gstack version
  - get latest gstack
allowed-tools:
  - Bash
  - Read
  - Write
  - AskUserQuestion
---
<!-- 从 SKILL.md.tmpl 自动生成 — 请勿直接编辑 -->
<!-- 重新生成：bun run gen:skill-docs -->

# /gstack-upgrade

将 gstack 升级到最新版本并展示新特性。

## 内联升级流程

当所有技能前言检测到 `UPGRADE_AVAILABLE` 时，都会引用本节内容。

### 步骤 1：询问用户（或自动升级）

首先，检查是否启用了自动升级：
```bash
_AUTO=""
[ "${GSTACK_AUTO_UPGRADE:-}" = "1" ] && _AUTO="true"
[ -z "$_AUTO" ] && _AUTO=$(.trae/skills/gstack/bin/gstack-config get auto_upgrade 2>/dev/null || true)
echo "AUTO_UPGRADE=$_AUTO"
```

**如果 `AUTO_UPGRADE=true` 或 `AUTO_UPGRADE=1`：** 跳过 AskUserQuestion。记录"正在自动升级 gstack v{old} → v{new}..."并直接进入步骤 2。如果自动升级期间 `./setup` 失败，则从备份（`.bak` 目录）恢复并警告用户："自动升级失败 — 已恢复之前版本。请手动运行 `/gstack-upgrade` 重试。"

**否则**，使用 AskUserQuestion：
- 问题："gstack **v{new}** 已可用（当前版本为 v{old}）。是否立即升级？"
- 选项：["是的，立即升级", "始终让我保持最新", "暂不升级", "不再询问"]

**如果选择"是的，立即升级"：** 进入步骤 2。

**如果选择"始终让我保持最新"：**
```bash
.trae/skills/gstack/bin/gstack-config set auto_upgrade true
```
告知用户："已启用自动升级。未来的更新将自动安装。"然后进入步骤 2。

**如果选择"暂不升级"：** 写入休眠状态，采用递增退避策略（首次休眠 = 24 小时，第二次 = 48 小时，第三次及以后 = 1 周），然后继续执行当前技能。不再提及升级事宜。
```bash
_SNOOZE_FILE="$HOME/.gstack/update-snoozed"
_REMOTE_VER="{new}"
_CUR_LEVEL=0
if [ -f "$_SNOOZE_FILE" ]; then
  _SNOOZED_VER=$(awk '{print $1}' "$_SNOOZE_FILE")
  if [ "$_SNOOZED_VER" = "$_REMOTE_VER" ]; then
    _CUR_LEVEL=$(awk '{print $2}' "$_SNOOZE_FILE")
    case "$_CUR_LEVEL" in *[!0-9]*) _CUR_LEVEL=0 ;; esac
  fi
fi
_NEW_LEVEL=$((_CUR_LEVEL + 1))
[ "$_NEW_LEVEL" -gt 3 ] && _NEW_LEVEL=3
echo "$_REMOTE_VER $_NEW_LEVEL $(date +%s)" > "$_SNOOZE_FILE"
```
注意：`{new}` 是来自 `UPGRADE_AVAILABLE` 输出的远程版本号 — 请从更新检查结果中替换该值。

告知用户下次提醒的时间："24 小时后再次提醒"（或 48 小时或 1 周，取决于层级）。提示："在 `~/.gstack/config.yaml` 中设置 `auto_upgrade: true` 可启用自动升级。"

**如果选择"不再询问"：**
```bash
.trae/skills/gstack/bin/gstack-config set update_check false
```
告知用户："已禁用更新检查。运行 `.trae/skills/gstack/bin/gstack-config set update_check true` 可重新启用。"
继续执行当前技能。

### 步骤 2：检测安装类型

```bash
if [ -d "$HOME/.trae/skills/gstack/.git" ]; then
  INSTALL_TYPE="global-git"
  INSTALL_DIR="$HOME/.trae/skills/gstack"
elif [ -d "$HOME/.gstack/repos/gstack/.git" ]; then
  INSTALL_TYPE="global-git"
  INSTALL_DIR="$HOME/.gstack/repos/gstack"
elif [ -d ".trae/skills/gstack/.git" ]; then
  INSTALL_TYPE="local-git"
  INSTALL_DIR=".trae/skills/gstack"
elif [ -d ".agents/skills/gstack/.git" ]; then
  INSTALL_TYPE="local-git"
  INSTALL_DIR=".agents/skills/gstack"
elif [ -d ".trae/skills/gstack" ]; then
  INSTALL_TYPE="vendored"
  INSTALL_DIR=".trae/skills/gstack"
elif [ -d "$HOME/.trae/skills/gstack" ]; then
  INSTALL_TYPE="vendored-global"
  INSTALL_DIR="$HOME/.trae/skills/gstack"
else
  echo "ERROR: gstack not found"
  exit 1
fi
echo "Install type: $INSTALL_TYPE at $INSTALL_DIR"
```

后续所有步骤将使用上方输出的安装类型和目录路径。

### 步骤 3：保存旧版本号

使用步骤 2 输出中的安装目录：

```bash
OLD_VERSION=$(cat "$INSTALL_DIR/VERSION" 2>/dev/null || echo "unknown")
```

### 步骤 4：执行升级

使用步骤 2 检测到的安装类型和目录：

**对于 git 安装**（global-git、local-git）：
```bash
cd "$INSTALL_DIR"
STASH_OUTPUT=$(git stash 2>&1)
git fetch origin
git reset --hard origin/main
./setup
```
如果 `$STASH_OUTPUT` 包含 "Saved working directory"，则警告用户："注意：本地更改已被暂存。在技能目录中运行 `git stash pop` 可恢复它们。"

**对于内置安装**（vendored、vendored-global）：
```bash
PARENT=$(dirname "$INSTALL_DIR")
TMP_DIR=$(mktemp -d)
git clone --depth 1 https://github.com/garrytan/gstack.git "$TMP_DIR/gstack"
mv "$INSTALL_DIR" "$INSTALL_DIR.bak"
mv "$TMP_DIR/gstack" "$INSTALL_DIR"
cd "$INSTALL_DIR" && ./setup
rm -rf "$INSTALL_DIR.bak" "$TMP_DIR"
```

### 步骤 4.5：处理本地内置副本

使用步骤 2 中的安装目录。检查是否还存在本地内置副本，以及团队模式是否激活：

```bash
_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
LOCAL_GSTACK=""
if [ -n "$_ROOT" ] && [ -d "$_ROOT/.trae/skills/gstack" ]; then
  _RESOLVED_LOCAL=$(cd "$_ROOT/.trae/skills/gstack" && pwd -P)
  _RESOLVED_PRIMARY=$(cd "$INSTALL_DIR" && pwd -P)
  if [ "$_RESOLVED_LOCAL" != "$_RESOLVED_PRIMARY" ]; then
    LOCAL_GSTACK="$_ROOT/.trae/skills/gstack"
  fi
fi
_TEAM_MODE=$(.trae/skills/gstack/bin/gstack-config get team_mode 2>/dev/null || echo "false")
echo "LOCAL_GSTACK=$LOCAL_GSTACK"
echo "TEAM_MODE=$_TEAM_MODE"
```

**如果 `LOCAL_GSTACK` 非空 且 `TEAM_MODE` 为 `true`：** 删除内置副本。团队模式使用全局安装作为唯一事实来源。

```bash
cd "$_ROOT"
git rm -r --cached .trae/skills/gstack/ 2>/dev/null || true
if ! grep -qF '.trae/skills/gstack/' .gitignore 2>/dev/null; then
  echo '.trae/skills/gstack/' >> .gitignore
fi
rm -rf "$LOCAL_GSTACK"
```
告知用户："已删除 `$LOCAL_GSTACK` 处的内置副本（团队模式已激活 — 全局安装为事实来源）。准备好后请提交 `.gitignore` 的更改。"

**如果 `LOCAL_GSTACK` 非空 且 `TEAM_MODE` 不为 `true`：** 通过从刚升级的主安装复制来更新它（与 README 中内置安装的方式相同）：
```bash
mv "$LOCAL_GSTACK" "$LOCAL_GSTACK.bak"
cp -Rf "$INSTALL_DIR" "$LOCAL_GSTACK"
rm -rf "$LOCAL_GSTACK/.git"
cd "$LOCAL_GSTACK" && ./setup
rm -rf "$LOCAL_GSTACK.bak"
```
告知用户："同时更新了 `$LOCAL_GSTACK` 处的内置副本 — 准备好后请提交 `.trae/skills/gstack/`。"

如果 `./setup` 失败，则从备份恢复并警告用户：
```bash
rm -rf "$LOCAL_GSTACK"
mv "$LOCAL_GSTACK.bak" "$LOCAL_GSTACK"
```
告知用户："同步失败 — 已恢复 `$LOCAL_GSTACK` 处的之前版本。请手动运行 `/gstack-upgrade` 重试。"

### 步骤 4.75：运行版本迁移

在 `./setup` 完成后，运行旧版本与新版本之间的所有迁移脚本。迁移用于处理 `./setup` 无法单独覆盖的状态修复（过期配置、孤立文件、目录结构变更）。

```bash
MIGRATIONS_DIR="$INSTALL_DIR/gstack-upgrade/migrations"
if [ -d "$MIGRATIONS_DIR" ]; then
  for migration in $(find "$MIGRATIONS_DIR" -maxdepth 1 -name 'v*.sh' -type f 2>/dev/null | sort -V); do
    # 从文件名中提取版本号：v0.15.2.0.sh → 0.15.2.0
    m_ver="$(basename "$migration" .sh | sed 's/^v//')"
    # 仅当此迁移版本高于旧版本时才运行
    # （对于段数相同的点分版本号，简单的字符串比较即可）
    if [ "$OLD_VERSION" != "unknown" ] && [ "$(printf '%s\n%s' "$OLD_VERSION" "$m_ver" | sort -V | head -1)" = "$OLD_VERSION" ] && [ "$OLD_VERSION" != "$m_ver" ]; then
      echo "Running migration $m_ver..."
      bash "$migration" || echo "  Warning: migration $m_ver had errors (non-fatal)"
    fi
  done
fi
```

迁移是位于 `gstack-upgrade/migrations/` 中的幂等 bash 脚本。每个脚本命名为
`v{VERSION}.sh`，仅在从旧版本升级时运行。有关如何添加新迁移，请参阅 CONTRIBUTING.md。

### 步骤 5：写入标记 + 清理缓存

```bash
mkdir -p ~/.gstack
echo "$OLD_VERSION" > ~/.gstack/just-upgraded-from
rm -f ~/.gstack/last-update-check
rm -f ~/.gstack/update-snoozed
```

### 步骤 6：展示新特性

读取 `$INSTALL_DIR/CHANGELOG.md`。找出旧版本与新版本之间的所有版本条目。按主题分组，总结为 5-7 条要点。不要信息过载 — 聚焦于面向用户的变更。除非内部重构影响重大，否则跳过它们。

格式：
```
gstack v{new} — 已从 v{old} 升级完成！

新特性：
- [要点 1]
- [要点 2]
- ...

祝您发布顺利！
```

### 步骤 7：继续

展示新特性后，继续执行用户最初调用的技能。升级已完成 — 无需进一步操作。

---

## 独立使用方式

当直接作为 `/gstack-upgrade` 调用时（而非从前言触发）：

1. 强制执行一次新的更新检查（绕过缓存）：
```bash
.trae/skills/gstack/bin/gstack-update-check --force 2>/dev/null || \
.trae/skills/gstack/bin/gstack-update-check --force 2>/dev/null || true
```
使用输出来判断是否有可用升级。

2. 如果输出 `UPGRADE_AVAILABLE <old> <new>`：按照上述步骤 2-6 执行。

3. 如果无输出（主安装已是最新）：检查是否存在过期的本地内置副本。

运行上述步骤 2 的 bash 代码块来检测主安装的类型和目录（`INSTALL_TYPE` 和 `INSTALL_DIR`）。然后运行上述步骤 4.5 的检测代码块来检查本地内置副本（`LOCAL_GSTACK`）和团队模式状态（`TEAM_MODE`）。

**如果 `LOCAL_GSTACK` 为空**（无本地内置副本）：告知用户"您已使用最新版本（v{version}）。"

**如果 `LOCAL_GSTACK` 非空 且 `TEAM_MODE` 为 `true`：** 使用上述步骤 4.5 的团队模式删除代码块移除内置副本。告知用户："全局 v{version} 已是最新。已删除过期的内置副本（团队模式已激活）。准备好后请提交 `.gitignore` 的更改。"

**如果 `LOCAL_GSTACK` 非空 且 `TEAM_MODE` 不为 `true`**，则比较版本：
```bash
PRIMARY_VER=$(cat "$INSTALL_DIR/VERSION" 2>/dev/null || echo "unknown")
LOCAL_VER=$(cat "$LOCAL_GSTACK/VERSION" 2>/dev/null || echo "unknown")
echo "PRIMARY=$PRIMARY_VER LOCAL=$LOCAL_VER"
```

**如果版本不同：** 按照上述步骤 4.5 的同步代码块，从主安装更新本地副本。告知用户："全局 v{PRIMARY_VER} 已是最新。已将本地内置副本从 v{LOCAL_VER} → v{PRIMARY_VER} 更新。准备好后请提交 `.trae/skills/gstack/`。"

**如果版本相同：** 告知用户"您已使用最新版本（v{PRIMARY_VER}）。全局和局部内置副本均已是最新。"
