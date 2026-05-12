import { DamengConfig, executeSql } from "../lib/java-bridge.js";

export const schemaToolSchema = {
  name: "describe_table",
  description: "查看达梦数据库表的列信息（列名、类型、是否为空、默认值、注释）",
  inputSchema: {
    type: "object",
    properties: {
      tableName: {
        type: "string",
        description: "表名（不区分大小写）",
      },
      schema: {
        type: "string",
        description: "模式名（默认当前用户模式）",
      },
    },
    required: ["tableName"],
  },
};

export async function handleSchemaTool(
  config: DamengConfig,
  args: Record<string, unknown>
): Promise<{ content: { type: string; text: string }[] }> {
  const tableName = String(args.tableName).toUpperCase();
  const schema = args.schema ? String(args.schema).toUpperCase() : null;

  let sql: string;
  if (schema) {
    sql = `SELECT
  c.COLUMN_ID,
  c.COLUMN_NAME,
  c.DATA_TYPE,
  c.DATA_LENGTH,
  c.DATA_PRECISION,
  c.DATA_SCALE,
  c.NULLABLE,
  c.DATA_DEFAULT,
  cm.COMMENTS
FROM ALL_TAB_COLUMNS c
LEFT JOIN ALL_COL_COMMENTS cm
  ON c.OWNER = cm.OWNER AND c.TABLE_NAME = cm.TABLE_NAME AND c.COLUMN_NAME = cm.COLUMN_NAME
WHERE c.OWNER = '${schema}' AND c.TABLE_NAME = '${tableName}'
ORDER BY c.COLUMN_ID`;
  } else {
    sql = `SELECT
  c.COLUMN_ID,
  c.COLUMN_NAME,
  c.DATA_TYPE,
  c.DATA_LENGTH,
  c.DATA_PRECISION,
  c.DATA_SCALE,
  c.NULLABLE,
  c.DATA_DEFAULT,
  cm.COMMENTS
FROM USER_TAB_COLUMNS c
LEFT JOIN USER_COL_COMMENTS cm
  ON c.TABLE_NAME = cm.TABLE_NAME AND c.COLUMN_NAME = cm.COLUMN_NAME
WHERE c.TABLE_NAME = '${tableName}'
ORDER BY c.COLUMN_ID`;
  }

  const result = await executeSql(config, sql, 500);

  if (result.error) {
    return {
      content: [
        {
          type: "text",
          text: `❌ 查询失败: ${result.error}`,
        },
      ],
    };
  }

  const rows = result.rows || [];

  if (rows.length === 0) {
    return {
      content: [
        {
          type: "text",
          text: schema
            ? `模式 "${schema}" 中未找到表 "${tableName}"`
            : `未找到表 "${tableName}"`,
        },
      ],
    };
  }

  const fullName = schema ? `${schema}.${tableName}` : tableName;
  let output = `📋 表结构: ${fullName}\n\n`;

  output += "序号 | 列名".padEnd(30) + " | 类型".padEnd(20) + " | 空 | 默认值".padEnd(15) + " | 注释\n";
  output += "-".repeat(90) + "\n";

  for (const row of rows) {
    const colId = String(row.COLUMN_ID ?? "").padEnd(4);
    const colName = String(row.COLUMN_NAME ?? "").padEnd(25);
    let typeStr = String(row.DATA_TYPE ?? "");
    if (row.DATA_LENGTH != null && ["VARCHAR", "CHAR", "VARCHAR2"].includes(typeStr)) {
      typeStr += `(${row.DATA_LENGTH})`;
    } else if (row.DATA_PRECISION != null && ["NUMBER", "DECIMAL"].includes(typeStr)) {
      typeStr += `(${row.DATA_PRECISION},${row.DATA_SCALE ?? 0})`;
    }
    typeStr = typeStr.padEnd(18);
    const nullable = row.NULLABLE === "Y" ? "Y" : "N";
    const defaultValue = row.DATA_DEFAULT != null ? String(row.DATA_DEFAULT).substring(0, 12) : "";
    const comments = row.COMMENTS ? String(row.COMMENTS) : "";

    output += `${colId} | ${colName} | ${typeStr} |  ${nullable}  | ${defaultValue.padEnd(12)} | ${comments}\n`;
  }

  return {
    content: [
      {
        type: "text",
        text: output,
      },
    ],
  };
}