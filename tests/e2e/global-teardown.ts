import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runEmailPrefix } from "./helpers/run-scope";

// Deletes only this invocation's accounts; app data cascades from auth.users.
// No-op when run ownership or .env.test.local credentials are absent.

function loadEnv(): Record<string, string> {
  try {
    // playwright runs with cwd = project root
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

export default async function globalTeardown() {
  const prefix = runEmailPrefix();
  if (!prefix) {
    console.warn("[teardown] missing/invalid E2E_RUN_ID — skipping cleanup");
    return;
  }
  const env = { ...loadEnv(), ...process.env };
  const ref = env.SUPA_DB_REF, host = env.SUPA_DB_HOST, password = env.SUPA_DB_PW;
  if (!ref || !host || !password) {
    console.warn("[teardown] no DB creds (.env.test.local) — skipping cleanup");
    return;
  }
  const { default: pg } = await import("pg");
  const client = new pg.Client({
    host, port: Number(env.SUPA_DB_PORT ?? 5432), user: `postgres.${ref}`,
    password, database: "postgres", ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10_000,
  });
  try {
    await client.connect();
    // Literal prefix matching: SQL LIKE would interpret underscores as wildcards.
    const where = "starts_with(email, $1)";
    const params = [prefix];
    // admins 는 auth.users 에 FK 가 없어 cascade 안 됨 — 테스트 관리자 이메일 별도 정리.
    await client.query(`delete from public.admins where ${where}`, params).catch(() => {});
    const res = await client.query(`delete from auth.users where ${where}`, params);
    console.log(`[teardown] deleted ${res.rowCount} test account(s) + cascaded data`);
  } catch (e) {
    console.warn("[teardown] cleanup failed:", e instanceof Error ? e.message : e);
  } finally {
    await client.end();
  }
}
