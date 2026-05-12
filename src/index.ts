#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { DamengConfig, executeSql, buildConnectionString } from "./lib/java-bridge.js";
import { queryToolSchema, handleQueryTool } from "./tools/query.js";
import { tablesToolSchema, handleTablesTool } from "./tools/tables.js";
import { schemaToolSchema, handleSchemaTool } from "./tools/schema.js";
import { fileURLToPath } from "node:url";
import path from "node:path";

function getConfig(): DamengConfig {
  const url = process.env.DAMENG_URL;
  const host = process.env.DAMENG_HOST;
  const port = process.env.DAMENG_PORT;
  const dbName = process.env.DAMENG_DB;
  const user = process.env.DAMENG_USER;
  const password = process.env.DAMENG_PASSWORD;

  if (!user || !password) {
    throw new Error(
      "环境变量 DAMENG_USER 和 DAMENG_PASSWORD 必须设置\n" +
      "同时需要设置 DAMENG_URL (完整 JDBC URL) 或 DAMENG_HOST + DAMENG_PORT + DAMENG_DB"
    );
  }

  const finalUrl = url || buildConnectionString(
    host || "localhost",
    port ? parseInt(port, 10) : 5236,
    dbName || ""
  );

  return { url: finalUrl, user, password };
}

async function main() {
  if (process.argv.includes("setup")) {
    const { execSync } = await import("node:child_process");
    const setupScript = path.resolve(
      fileURLToPath(new URL("../scripts/setup.cjs", import.meta.url))
    );
    execSync(`node "${setupScript}"`, { stdio: "inherit" });
    return;
  }

  const config = getConfig();
  const server = new Server(
    {
      name: "mcp-server-dameng",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [queryToolSchema, tablesToolSchema, schemaToolSchema],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "query_dameng":
          return await handleQueryTool(config, args as Record<string, unknown>);

        case "list_tables":
          return await handleTablesTool(config, args as Record<string, unknown>);

        case "describe_table":
          return await handleSchemaTool(config, args as Record<string, unknown>);

        default:
          return {
            content: [{ type: "text", text: `未知工具: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `执行失败: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  });

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      {
        uri: "dameng://info",
        name: "数据库连接信息",
        description: "当前达梦数据库连接配置信息（不含密码）",
        mimeType: "application/json",
      },
      {
        uri: "dameng://tables",
        name: "所有用户表",
        description: "当前用户下所有表的列表",
        mimeType: "application/json",
      },
    ],
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;

    if (uri === "dameng://info") {
      const maskedConfig = {
        url: config.url,
        user: config.user,
        password: "******",
      };
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(maskedConfig, null, 2),
          },
        ],
      };
    }

    if (uri === "dameng://tables") {
      const result = await executeSql(
        config,
        "SELECT TABLE_NAME, TABLESPACE_NAME, STATUS FROM USER_TABLES ORDER BY TABLE_NAME",
        500
      );
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    return {
      contents: [
        {
          uri,
          mimeType: "text/plain",
          text: `未知资源: ${uri}`,
        },
      ],
    };
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("达梦数据库 MCP Server 已启动");
  console.error(`  连接: ${config.url}`);
  console.error(`  用户: ${config.user}`);
}

main().catch((error) => {
  console.error("启动失败:", error);
  process.exit(1);
});