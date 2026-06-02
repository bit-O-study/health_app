import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// E2E 전용 DB 헬퍼. import.meta 미사용(Playwright 로더 호환) — cwd 는 repo 루트.
function loadEnv(): Record<string, string> {
  try {
    const txt = readFileSync(resolve(process.cwd(), ".env.test.local"), "utf8");
    const out: Record<string, string> = {};
    for (const line of txt.split(/\r?\n/)) {
      if (line.trim().startsWith("#")) continue;
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] = m[2];
    }
    return out;
  } catch {
    return {};
  }
}

const env = { ...loadEnv(), ...process.env };
export const hasDb = Boolean(env.SUPA_DB_REF && env.SUPA_DB_HOST && env.SUPA_DB_PW);

export async function dbQuery<T = unknown>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const { default: pg } = await import("pg");
  const client = new pg.Client({
    host: env.SUPA_DB_HOST,
    port: Number(env.SUPA_DB_PORT ?? 5432),
    user: `postgres.${env.SUPA_DB_REF}`,
    password: env.SUPA_DB_PW,
    database: "postgres",
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10_000,
  });
  await client.connect();
  try {
    const res = await client.query(sql, params);
    return res.rows as T[];
  } finally {
    await client.end();
  }
}
