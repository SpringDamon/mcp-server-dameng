import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JAVA_DIR = path.resolve(__dirname, "java");
const LIB_DIR = path.resolve(__dirname, "lib");
const OUTPUT = path.resolve(__dirname, "../docs/database-schema.md");

const DB_URL = "jdbc:dm://172.31.10.35:5236?schema=CROSS_MALL";
const DB_USER = "CROSS_MALL";
const DB_PASS = "Kdgc@2025";

function execJava(sql, limit = 500) {
  return new Promise((resolve, reject) => {
    const proc = spawn("java", [
      "-Dfile.encoding=UTF-8",
      "-cp", `${LIB_DIR}/DmJdbcDriver18.jar;${JAVA_DIR}`,
      "DamengJdbcBridge", DB_URL, DB_USER, DB_PASS, sql, String(limit),
    ], { cwd: JAVA_DIR });

    let stdout = "", stderr = "";
    proc.stdout.on("data", (d) => stdout += d);
    proc.stderr.on("data", (d) => stderr += d);
    proc.on("close", (code) => {
      if (code !== 0) return reject(new Error(stderr));
      try { resolve(JSON.parse(stdout)); }
      catch (e) { reject(new Error(`JSON parse error: ${e.message}\n${stdout}`)); }
    });
    proc.on("error", reject);
  });
}

function moduleGroup(tableName) {
  const prefix = tableName.split("_")[0];
  const groups = {
    erp: "ERP 业务模块",
    sys: "系统管理模块",
    gen: "代码生成模块",
    magic: "Magic API 接口模块",
    mall: "商城模块",
    trade: "贸易/跨境模块",
    region: "区域管理",
    risk: "风险管理",
    sale: "销售模块",
    sanction: "制裁/黑名单管理",
    stock: "库存模块",
    warn: "预警模块",
  };
  return groups[prefix] || "其他";
}

function groupAnchor(group) {
  const map = {
    "ERP 业务模块": "erp",
    "系统管理模块": "sys",
    "代码生成模块": "gen",
    "Magic API 接口模块": "magic",
    "商城模块": "mall",
    "贸易/跨境模块": "trade",
    "区域管理": "region",
    "风险管理": "risk",
    "销售模块": "sale",
    "制裁/黑名单管理": "sanction",
    "库存模块": "stock",
    "预警模块": "warn",
    "其他": "other",
  };
  return map[group] || "other";
}

async function main() {
  console.log("正在获取所有表名...");
  const tablesResult = await execJava(
    "SELECT TABLE_NAME FROM USER_TABLES ORDER BY TABLE_NAME"
  );
  const tables = tablesResult.rows.map((r) => r.TABLE_NAME);

  console.log(`共 ${tables.length} 张表，正在逐表获取结构信息...`);

  const allSchemas = {};
  for (let i = 0; i < tables.length; i++) {
    const table = tables[i];
    process.stdout.write(`  [${i + 1}/${tables.length}] ${table}...`);
    try {
      const result = await execJava(
        `SELECT c.COLUMN_ID, c.COLUMN_NAME, c.DATA_TYPE, c.DATA_LENGTH, ` +
        `c.DATA_PRECISION, c.DATA_SCALE, c.NULLABLE, c.DATA_DEFAULT, ` +
        `cm.COMMENTS FROM USER_TAB_COLUMNS c ` +
        `LEFT JOIN USER_COL_COMMENTS cm ON c.TABLE_NAME = cm.TABLE_NAME AND c.COLUMN_NAME = cm.COLUMN_NAME ` +
        `WHERE c.TABLE_NAME = '${table}' ORDER BY c.COLUMN_ID`
      );
      allSchemas[table] = result.rows;
      console.log(" ✅");
    } catch (e) {
      console.log(" ❌", e.message);
    }
  }

  console.log("\n正在生成文档...");

  const grouped = {};
  for (const table of tables) {
    const group = moduleGroup(table);
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(table);
  }

  const lines = [];
  lines.push("# CROSS_MALL 数据库表结构文档");
  lines.push("");
  lines.push("> **自动生成时间**: " + new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }));
  lines.push("> **数据库**: 达梦 DM8");
  lines.push("> **连接**: `jdbc:dm://172.31.10.35:5236?schema=CROSS_MALL`");
  lines.push("> **用户**: CROSS_MALL");
  lines.push("> **总表数**: " + tables.length);
  lines.push("");
  lines.push("---");
  lines.push("");

  // 目录
  lines.push("## 📑 目录");
  lines.push("");
  for (const [group, tbls] of Object.entries(grouped)) {
    lines.push(`- [${group}](#${groupAnchor(group)}) — ${tbls.length} 张表`);
  }
  lines.push("");

  // 按模块输出
  for (const [group, tbls] of Object.entries(grouped)) {
    lines.push("---");
    lines.push("");
    lines.push(`## <a id="${groupAnchor(group)}"></a>${group}`);
    lines.push("");
    lines.push(`共 ${tbls.length} 张表`);
    lines.push("");

    for (const table of tbls) {
      const cols = allSchemas[table] || [];
      lines.push(`### ${table}`);
      lines.push("");
      lines.push("| # | 列名 | 类型 | 长度/精度 | 可空 | 默认值 | 注释 |");
      lines.push("|---|------|------|-----------|:----:|--------|------|");

      for (const col of cols) {
        const id = col.COLUMN_ID ?? "";
        const name = col.COLUMN_NAME ?? "";
        let typeStr = col.DATA_TYPE ?? "";
        const len = col.DATA_LENGTH;
        const prec = col.DATA_PRECISION;
        const scale = col.DATA_SCALE;
        let lenStr = "";
        if (len != null && ["VARCHAR", "CHAR", "VARCHAR2"].includes(typeStr)) {
          lenStr = String(len);
        } else if (prec != null && ["NUMBER", "DECIMAL", "NUMERIC"].includes(typeStr)) {
          lenStr = `${prec},${scale ?? 0}`;
        }
        const nullable = col.NULLABLE === "Y" ? "YES" : "NO";
        const defVal = col.DATA_DEFAULT != null ? String(col.DATA_DEFAULT).substring(0, 30) : "";
        const comment = col.COMMENTS ? String(col.COMMENTS) : "";

        lines.push(`| ${id} | ${name} | ${typeStr} | ${lenStr} | ${nullable} | ${defVal} | ${comment} |`);
      }
      lines.push("");
    }
  }

  lines.push("---");
  lines.push("");
  lines.push("## 📊 统计");
  lines.push("");
  lines.push(`| 模块 | 表数 |`);
  lines.push("|------|:----:|");
  for (const [group, tbls] of Object.entries(grouped)) {
    lines.push(`| ${group} | ${tbls.length} |`);
  }
  lines.push(`| **合计** | **${tables.length}** |`);
  lines.push("");

  const content = lines.join("\n");
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, content, "utf-8");

  console.log(`\n✅ 文档已生成: ${OUTPUT}`);
  console.log(`   共 ${tables.length} 张表，${Object.keys(grouped).length} 个模块`);
}

main().catch(console.error);