import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "../..");
const JAVA_DIR = path.join(PROJECT_ROOT, "java");
const LIB_DIR = path.join(PROJECT_ROOT, "lib");

export interface DamengConfig {
  url: string;
  user: string;
  password: string;
}

export interface QueryResult {
  columns?: string[];
  types?: string[];
  rows?: Record<string, unknown>[];
  rowCount?: number;
  truncated?: boolean;
  affectedRows?: number;
  message?: string;
  error?: string;
  sqlState?: string;
  errorCode?: number;
}

function getClasspath(): string {
  const envDriver = process.env.DAMENG_DRIVER_PATH;
  if (envDriver && fs.existsSync(envDriver)) {
    return `${envDriver};${JAVA_DIR}`;
  }
  const dmJar = path.join(LIB_DIR, "DmJdbcDriver18.jar");
  if (fs.existsSync(dmJar)) {
    return `${dmJar};${JAVA_DIR}`;
  }
  throw new Error(
    "未找到达梦 JDBC 驱动 JAR 文件。\n" +
    "请通过环境变量 DAMENG_DRIVER_PATH 指定驱动路径，\n" +
    "或将 DmJdbcDriver18.jar 放置在 lib/ 目录下。\n" +
    "运行 `npx mcp-server-dameng setup` 获取帮助。"
  );
}

export async function executeSql(
  config: DamengConfig,
  sql: string,
  limit = 200
): Promise<QueryResult> {
  return new Promise((resolve, reject) => {
    const classpath = getClasspath();
    const proc = spawn("java", [
      "-Dfile.encoding=UTF-8",
      "-cp",
      classpath,
      "DamengJdbcBridge",
      config.url,
      config.user,
      config.password,
      sql,
      String(limit),
    ], {
      cwd: JAVA_DIR,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        try {
          const errResult = JSON.parse(stderr) as QueryResult;
          resolve(errResult);
        } catch {
          resolve({
            error: stderr || `Java process exited with code ${code}`,
          });
        }
        return;
      }

      try {
        const result = JSON.parse(stdout) as QueryResult;
        resolve(result);
      } catch (e) {
        resolve({
          error: `Failed to parse Java output: ${e instanceof Error ? e.message : String(e)}`,
        });
      }
    });

    proc.on("error", (err) => {
      resolve({
        error: `Failed to start Java process: ${err.message}`,
      });
    });
  });
}

export function buildConnectionString(host: string, port: number, dbName: string): string {
  return `jdbc:dm://${host}:${port}?schema=${dbName}`;
}