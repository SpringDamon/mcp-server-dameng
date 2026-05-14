#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const LIB_DIR = path.resolve(__dirname, "..", "lib");
const JAVA_DIR = path.resolve(__dirname, "..", "java");
const DRIVER_JAR = path.join(LIB_DIR, "DmJdbcDriver18.jar");

console.log("");
console.log("╔══════════════════════════════════════════════════════╗");
console.log("║      达梦数据库 MCP Server - 环境配置工具          ║");
console.log("╚══════════════════════════════════════════════════════╝");
console.log("");

// 1. 检查 Java
try {
  const javaVer = execSync("java -version 2>&1", { encoding: "utf8" });
  console.log("✅ Java 已安装:");
  console.log("   " + javaVer.split("\n")[0]);
} catch {
  console.log("❌ 未找到 Java 运行环境");
  console.log("   请安装 Java 8 或更高版本: https://www.java.com/download/");
  console.log("");
}

// 2. 检查 JDBC 驱动
console.log("");
console.log("--- JDBC 驱动检查 ---");
if (fs.existsSync(DRIVER_JAR)) {
  const stats = fs.statSync(DRIVER_JAR);
  const sizeKB = (stats.size / 1024).toFixed(1);
  console.log(`✅ 已找到达梦 JDBC 驱动: ${DRIVER_JAR} (${sizeKB} KB)`);
} else {
  console.log("❌ 未找到达梦 JDBC 驱动");
  console.log("");
  console.log("请手动下载 DmJdbcDriver18.jar 并放置到:");
  console.log("   " + LIB_DIR);
  console.log("");
  console.log("下载方式:");
  console.log("  方式 1: 从达梦官网 https://www.dameng.com 下载");
  console.log("  方式 2: 从达梦 Maven 仓库下载:");
  console.log("     mvn dependency:copy");
  console.log("       -Dartifact=com.dameng:DmJdbcDriver18:8.1.2.192");
  console.log("       -DoutputDirectory=" + LIB_DIR);
  console.log("  方式 3: 通过环境变量 DAMENG_DRIVER_PATH 指定路径");
  console.log("");
  console.log("配置 Trae/Claude/Cursor 时，在 env 中添加:");
  console.log('   "DAMENG_DRIVER_PATH": "D:/path/to/DmJdbcDriver18.jar"');
  console.log("");
}

// 3. 检查 Java 桥接类
console.log("");
console.log("--- Java 桥接类检查 ---");
const classFile = path.join(JAVA_DIR, "DamengJdbcBridge.class");
if (fs.existsSync(classFile)) {
  console.log("✅ Java 桥接类已编译");
} else {
  console.log("⚠️  Java 桥接类未编译，尝试编译...");
  try {
    execSync(
      `javac -cp "${DRIVER_JAR}" DamengJdbcBridge.java`,
      { cwd: JAVA_DIR, stdio: "pipe" }
    );
    console.log("✅ 编译成功");
  } catch (e) {
    console.log("❌ 编译失败: " + e.message);
    console.log("   请确保已安装 JDK 并手动运行:");
    console.log(`   cd ${JAVA_DIR}`);
    console.log(`   javac -cp "${DRIVER_JAR}" DamengJdbcBridge.java`);
  }
}

// 4. 环境变量说明
console.log("");
console.log("--- 环境变量配置 ---");
console.log("");
console.log("必需环境变量:");
console.log("  DAMENG_URL      完整 JDBC 连接 URL");
console.log("                   示例: jdbc:dm://localhost:5236?schema=DB_NAME");
console.log("  DAMENG_USER     数据库用户名");
console.log("  DAMENG_PASSWORD 数据库密码");
console.log("");
console.log("可选环境变量:");
console.log("  DAMENG_DRIVER_PATH   JDBC 驱动 JAR 文件路径（默认查找 lib/ 目录）");
console.log("  DAMENG_SCHEMA        默认模式名（连接后自动设置）");
console.log("");
console.log("或者使用拆分方式（替代 DAMENG_URL）:");
console.log("  DAMENG_HOST     数据库主机地址（默认 localhost）");
console.log("  DAMENG_PORT     数据库端口（默认 5236）");
console.log("");

// 5. MCP 配置示例
console.log("--- MCP 配置示例 ---");
console.log("");
console.log("在 Trae/Claude/Cursor 的 mcp.json 中添加:");
console.log("");
console.log(JSON.stringify({
  "mcpServers": {
    "dameng": {
      "command": "npx",
      "args": ["-y", "mcp-server-dameng"],
      "env": {
        "DAMENG_URL": "jdbc:dm://your-host:5236",
        "DAMENG_USER": "your_username",
        "DAMENG_PASSWORD": "your_password",
        "DAMENG_SCHEMA": "YOUR_SCHEMA"
      }
    }
  }
}, null, 2));
console.log("");

console.log("--- 配置完成 ---");
console.log("");