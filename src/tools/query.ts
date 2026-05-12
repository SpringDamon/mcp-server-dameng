import { z } from "zod";
import { DamengConfig, executeSql, QueryResult } from "../lib/java-bridge.js";

export const queryToolSchema = {
  name: "query_dameng",
  description: "执行达梦数据库 SQL 查询（SELECT/DML），返回结构化结果",
  inputSchema: {
    type: "object",
    properties: {
      sql: {
        type: "string",
        description: "要执行的 SQL 语句",
      },
      limit: {
        type: "number",
        description: "最大返回行数（默认 200）",
        default: 200,
      },
    },
    required: ["sql"],
  },
};

export async function handleQueryTool(
  config: DamengConfig,
  args: Record<string, unknown>
): Promise<{ content: { type: string; text: string }[] }> {
  const sql = String(args.sql);
  const limit = typeof args.limit === "number" ? args.limit : 200;

  const result = await executeSql(config, sql, limit);

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

  if (result.affectedRows !== undefined) {
    return {
      content: [
        {
          type: "text",
          text: `✅ ${result.message}\n影响行数: ${result.affectedRows}`,
        },
      ],
    };
  }

  const cols = result.columns || [];
  const rows = result.rows || [];
  const types = result.types || [];

  let output = `查询结果 (${result.rowCount} 行${result.truncated ? ", 已截断" : ""}):\n\n`;

  if (rows.length === 0) {
    output += "（空结果集）\n";
  } else {
    const colWidths = cols.map((col, i) => {
      const maxDataLen = rows.reduce((max, row) => {
        const val = row[col];
        return Math.max(max, String(val ?? "NULL").length);
      }, 0);
      return Math.max(col.length, maxDataLen, 4);
    });

    const header = cols.map((col, i) => col.padEnd(colWidths[i])).join(" | ");
    const separator = colWidths.map((w) => "-".repeat(w)).join("-|-");

    output += header + "\n";
    output += separator + "\n";

    for (const row of rows) {
      const line = cols.map((col, i) => {
        const val = row[col];
        return String(val ?? "NULL").padEnd(colWidths[i]);
      }).join(" | ");
      output += line + "\n";
    }
  }

  output += `\n列信息:\n`;
  for (let i = 0; i < cols.length; i++) {
    output += `  - ${cols[i]} (${types[i] || "unknown"})\n`;
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