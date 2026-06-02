import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Self-contained (no cross-dir imports, no import.meta) to stay compatible with
// Playwright's CJS loader for config-referenced files. Deletes throwaway accounts
// the suite created on the live Supabase; all app tables cascade from auth.users,
// so this wipes their data too. No-op when .env.test.local creds are absent.
const TEST_EMAIL_PREFIXES = ["e2e_", "full_", "vf_", "verify_"];

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
    const where = TEST_EMAIL_PREFIXES.map((_, i) => `email like $${i + 1}`).join(" or ");
    const res = await client.query(
      `delete from auth.users where ${where}`,
      TEST_EMAIL_PREFIXES.map((p) => `${p}%`),
    );
    console.log(`[teardown] deleted ${res.rowCount} test account(s) + cascaded data`);
  } catch (e) {
    console.warn("[teardown] cleanup failed:", e instanceof Error ? e.message : e);
  } finally {
    await client.end();
  }
}
