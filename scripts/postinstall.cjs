#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const LIB_DIR = path.resolve(__dirname, "..", "lib");
const JAVA_DIR = path.resolve(__dirname, "..", "java");
const DRIVER_JAR = path.join(LIB_DIR, "DmJdbcDriver18.jar");
const CLASS_FILE = path.join(JAVA_DIR, "DamengJdbcBridge.class");

console.log("");
console.log("📦 mcp-server-dameng 安装完成");
console.log("");

const issues = [];

if (!fs.existsSync(DRIVER_JAR)) {
  issues.push("❌ 未找到达梦 JDBC 驱动 (lib/DmJdbcDriver18.jar)");
}

if (!fs.existsSync(CLASS_FILE)) {
  issues.push("⚠️  Java 桥接类未编译");
}

if (issues.length > 0) {
  console.log("安装后需要完成以下配置:");
  console.log("");
  issues.forEach((msg) => console.log("  " + msg));
  console.log("");
  console.log("运行以下命令获取配置帮助:");
  console.log("  npx mcp-server-dameng setup");
  console.log("");
} else {
  console.log("✅ 所有组件已就绪，可以直接使用");
  console.log("");
  console.log("配置环境变量后启动:");
  console.log("  npx mcp-server-dameng");
  console.log("");
}