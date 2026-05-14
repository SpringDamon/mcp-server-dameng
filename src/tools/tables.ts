import { DamengConfig, executeSql } from "../lib/java-bridge.js";

function validateIdentifier(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9_]/g, "").toUpperCase();
  if (!cleaned || cleaned.length > 128) {
    throw new Error(`无效的标识符: ${name}`);
  }
  return cleaned;
}

export const tablesToolSchema = {
  name: "list_tables",
  description: "列出达梦数据库中所有用户表（含表名、注释、行数估算）",
  inputSchema: {
    type: "object",
    properties: {
      schema: {
        type: "string",
        description: "模式名（默认当前用户模式）",
      },
    },
  },
};

export async function handleTablesTool(
  config: DamengConfig,
  args: Record<string, unknown>
): Promise<{ content: { type: string; text: string }[] }> {
  const schema = args.schema ? validateIdentifier(String(args.schema)) : null;

  let sql: string;
  if (schema) {
    sql = `SELECT OWNER, TABLE_NAME, TABLESPACE_NAME, STATUS, NUM_ROWS
FROM ALL_TABLES
WHERE OWNER = '${schema}'
ORDER BY TABLE_NAME`;
  } else {
    sql = `SELECT TABLE_NAME, TABLESPACE_NAME, STATUS
FROM USER_TABLES
ORDER BY TABLE_NAME`;
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
            ? `模式 "${schema}" 中没有找到用户表`
            : "当前用户下没有找到用户表",
        },
      ],
    };
  }

  let output = `📋 共找到 ${rows.length} 张表:\n\n`;
  for (const row of rows) {
    const tableName = String(row.TABLE_NAME ?? "");
    const tablespace = String(row.TABLESPACE_NAME ?? "-");
    const status = String(row.STATUS ?? "");
    const numRows = row.NUM_ROWS != null ? ` (~${row.NUM_ROWS} 行)` : "";
    output += `  - ${tableName.padEnd(35)} ${status}${numRows}\n`;
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