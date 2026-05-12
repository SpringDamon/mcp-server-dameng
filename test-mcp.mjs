import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.resolve(__dirname, "dist/index.js");

let messageId = 0;
function createRequest(method, params = {}) {
  return JSON.stringify({
    jsonrpc: "2.0",
    id: ++messageId,
    method,
    params,
  }) + "\n";
}

function runTest(name, request) {
  return new Promise((resolve, reject) => {
    console.log(`\n===== 测试: ${name} =====`);

    const proc = spawn("node", [serverPath], {
      env: {
        ...process.env,
        DAMENG_URL: "jdbc:dm://172.31.10.35:5236?schema=CROSS_MALL",
        DAMENG_USER: "CROSS_MALL",
        DAMENG_PASSWORD: "Kdgc@2025",
      },
      stdio: ["pipe", "pipe", "pipe"],
    });

    let output = "";
    const timeout = setTimeout(() => {
      proc.kill();
      reject(new Error("请求超时"));
    }, 15000);

    proc.stdout.on("data", (data) => {
      output += data.toString();
      const lines = output.split("\n").filter((l) => l.trim());
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          clearTimeout(timeout);
          proc.kill();
          console.log("响应:", JSON.stringify(parsed, null, 2));
          resolve(parsed);
          return;
        } catch {
          // 还没收到完整 JSON，继续等待
        }
      }
    });

    proc.stderr.on("data", (data) => {
      // MCP Server 的日志输出到 stderr
      const msg = data.toString().trim();
      if (msg) console.log("[Server]", msg);
    });

    proc.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    proc.on("exit", (code) => {
      clearTimeout(timeout);
      if (code !== 0 && !output) {
        reject(new Error(`进程退出，code=${code}`));
      }
    });

    proc.stdin.write(request);
    proc.stdin.end();
  });
}

async function main() {
  let passed = 0;
  let failed = 0;

  // 测试 1: tools/list
  try {
    const result = await runTest("tools/list - 获取工具列表", createRequest("tools/list"));
    if (result.result && result.result.tools) {
      const toolNames = result.result.tools.map((t) => t.name);
      console.log(`\n✅ 注册的工具: ${toolNames.join(", ")}`);
      if (toolNames.includes("query_dameng") && toolNames.includes("list_tables") && toolNames.includes("describe_table")) {
        console.log("✅ 所有 3 个工具已正确注册");
        passed++;
      }
    }
  } catch (e) {
    console.error(`❌ tools/list 失败: ${e.message}`);
    failed++;
  }

  // 测试 2: resources/list
  try {
    const result = await runTest("resources/list - 获取资源列表", createRequest("resources/list"));
    if (result.result && result.result.resources) {
      const resourceUris = result.result.resources.map((r) => r.uri);
      console.log(`\n✅ 注册的资源: ${resourceUris.join(", ")}`);
      passed++;
    }
  } catch (e) {
    console.error(`❌ resources/list 失败: ${e.message}`);
    failed++;
  }

  // 测试 3: query_dameng - SELECT
  try {
    const result = await runTest("query_dameng - SELECT 查询", createRequest("tools/call", {
      name: "query_dameng",
      arguments: { sql: "SELECT COUNT(*) AS TABLE_COUNT FROM USER_TABLES" },
    }));
    if (result.result && result.result.content) {
      const text = result.result.content[0].text;
      if (text.includes("TABLE_COUNT")) {
        console.log(`\n✅ SELECT 查询成功`);
        passed++;
      }
    }
  } catch (e) {
    console.error(`❌ query_dameng SELECT 失败: ${e.message}`);
    failed++;
  }

  // 测试 4: list_tables
  try {
    const result = await runTest("list_tables - 列出用户表", createRequest("tools/call", {
      name: "list_tables",
      arguments: {},
    }));
    if (result.result && result.result.content) {
      const text = result.result.content[0].text;
      if (text.includes("共找到") || text.includes("表")) {
        console.log(`\n✅ list_tables 成功`);
        passed++;
      }
    }
  } catch (e) {
    console.error(`❌ list_tables 失败: ${e.message}`);
    failed++;
  }

  // 测试 5: describe_table
  try {
    const result = await runTest("describe_table - 查看表结构", createRequest("tools/call", {
      name: "describe_table",
      arguments: { tableName: "SYS_CONFIG" },
    }));
    if (result.result && result.result.content) {
      const text = result.result.content[0].text;
      if (text.includes("SYS_CONFIG") || text.includes("列名")) {
        console.log(`\n✅ describe_table 成功`);
        passed++;
      }
    }
  } catch (e) {
    console.error(`❌ describe_table 失败: ${e.message}`);
    failed++;
  }

  // 测试 6: resources/read - dameng://info
  try {
    const result = await runTest("resources/read - 读取连接信息", createRequest("resources/read", {
      uri: "dameng://info",
    }));
    if (result.result && result.result.contents) {
      console.log(`\n✅ resources/read 成功`);
      passed++;
    }
  } catch (e) {
    console.error(`❌ resources/read 失败: ${e.message}`);
    failed++;
  }

  console.log(`\n========================================`);
  console.log(`📊 测试结果: ${passed} 通过, ${failed} 失败`);
  console.log(`========================================`);

  process.exit(failed > 0 ? 1 : 0);
}

main();