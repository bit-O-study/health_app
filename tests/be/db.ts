import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import pg from "pg";

// Loads test-only DB creds from .env.test.local (gitignored). The app itself
// never uses these — they exist only so BE/E2E tests can introspect the live DB
// (schema-sync guard) and clean up throwaway test accounts.
const here = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(here, "../../.env.test.local");

function loadTestEnv(): Record<string, string> {
  try {
    const txt = readFileSync(envPath, "utf8");
    const out: Record<string, string> = {};
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && !line.trim().startsWith("#")) out[m[1]] = m[2];
    }
    return out;
  } catch {
    return {};
  }
}

const env = { ...loadTestEnv(), ...process.env };

export const dbCreds = {
  ref: env.SUPA_DB_REF ?? "",
  host: env.SUPA_DB_HOST ?? "",
  port: Number(env.SUPA_DB_PORT ?? 5432),
  password: env.SUPA_DB_PW ?? "",
};

/** True only when test DB creds are present — gate DB-touching tests on this. */
export const hasDbCreds = Boolean(dbCreds.ref && dbCreds.host && dbCreds.password);

export function makeClient(): pg.Client {
  return new pg.Client({
    host: dbCreds.host,
    port: dbCreds.port,
    user: `postgres.${dbCreds.ref}`,
    password: dbCreds.password,
    database: "postgres",
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10_000,
  });
}

/** Email prefixes used by E2E helpers for throwaway accounts. */
export const TEST_EMAIL_PREFIXES = ["e2e_", "full_", "vf_", "verify_"];
