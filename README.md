# mcp-server-dameng

达梦数据库 MCP Server — 通过 [Model Context Protocol (MCP)](https://modelcontextprotocol.io) 让 AI 助手（Claude、Trae、Cursor 等）直接连接和查询达梦 DM8 数据库。

## 功能

- **query_dameng** — 执行 SQL 查询（SELECT/DML），返回结构化结果
- **list_tables** — 列出数据库中所有用户表
- **describe_table** — 查看指定表的列信息（类型、可空、默认值、注释）

## 前置条件

1. **Node.js** >= 18
2. **Java** 8+（JDK 或 JRE）— 用于 JDBC 桥接
3. **达梦 JDBC 驱动** — `DmJdbcDriver18.jar`

## 安装

### 方式一：npx 直接运行（推荐）

```bash
# 首次运行会自动下载 npm 包
npx -y mcp-server-dameng
```

### 方式二：全局安装

```bash
npm install -g mcp-server-dameng
mcp-server-dameng
```

### 方式三：项目内安装

```bash
npm install mcp-server-dameng
npx mcp-server-dameng
```

## 配置 JDBC 驱动

由于达梦 JDBC 驱动（DmJdbcDriver18.jar）是专有软件，无法通过 npm 自动分发，需要手动配置。

### 方式 A：通过环境变量指定路径

```bash
# 设置驱动路径环境变量
export DAMENG_DRIVER_PATH=/path/to/DmJdbcDriver18.jar
```

### 方式 B：放置到 lib 目录

将 `DmJdbcDriver18.jar` 复制到包目录下的 `lib/` 文件夹中：

```bash
# 全局安装时
cp DmJdbcDriver18.jar $(npm root -g)/mcp-server-dameng/lib/

# 项目内安装时
cp DmJdbcDriver18.jar node_modules/mcp-server-dameng/lib/
```

### 方式 C：运行 setup 命令获取帮助

```bash
npx mcp-server-dameng setup
```

## 环境变量配置

### 必需

| 变量 | 说明 | 示例 |
|------|------|------|
| `DAMENG_URL` | 完整 JDBC 连接 URL | `jdbc:dm://localhost:5236?schema=DB_NAME` |
| `DAMENG_USER` | 数据库用户名 | `your_username` |
| `DAMENG_PASSWORD` | 数据库密码 | `your_password` |

或者使用拆分方式（替代 `DAMENG_URL`）：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DAMENG_HOST` | 数据库主机地址 | `localhost` |
| `DAMENG_PORT` | 数据库端口 | `5236` |
| `DAMENG_DB` | 数据库模式名 | — |

### 可选

| 变量 | 说明 |
|------|------|
| `DAMENG_DRIVER_PATH` | JDBC 驱动 JAR 文件路径 |

## 在 AI 工具中配置

### Trae / Claude Desktop / Cursor

在 MCP 配置文件（`mcp.json`）中添加：

```json
{
  "mcpServers": {
    "dameng": {
      "command": "npx",
      "args": ["-y", "mcp-server-dameng"],
      "env": {
        "DAMENG_URL": "jdbc:dm://your-host:5236?schema=YOUR_SCHEMA",
        "DAMENG_USER": "your_username",
        "DAMENG_PASSWORD": "your_password",
        "DAMENG_DRIVER_PATH": "D:/path/to/DmJdbcDriver18.jar"
      }
    }
  }
}
```

## 开发

```bash
# 克隆仓库
git clone https://github.com/your-username/mcp-server-dameng.git
cd mcp-server-dameng

# 安装依赖
npm install

# 放置 JDBC 驱动
# 将 DmJdbcDriver18.jar 复制到 lib/ 目录

# 编译 Java 桥接类
npm run compile:java

# 编译 TypeScript
npm run build

# 开发模式（热重载）
npm run dev
```

## 项目结构

```
mcp-server-dameng/
├── src/
│   ├── index.ts              # MCP Server 入口
│   ├── lib/
│   │   └── java-bridge.ts    # Java JDBC 桥接
│   └── tools/
│       ├── query.ts          # query_dameng 工具
│       ├── tables.ts         # list_tables 工具
│       └── schema.ts         # describe_table 工具
├── java/
│   └── DamengJdbcBridge.java # Java JDBC 桥接实现
├── lib/                      # JDBC 驱动目录（需手动放置）
├── scripts/
│   ├── setup.js              # 环境配置工具
│   └── postinstall.js        # 安装后检查
├── dist/                     # 编译输出
└── package.json
```

## 许可证

MIT