// One-off live-DB migration runner. Reads creds from .env.test.local and runs
// the SQL passed as the first CLI arg (a file path). Usage:
//   node scripts/migrate-phase.mjs scripts/_mig.sql
import { readFileSync } from "node:fs";
import pg from "pg";

function loadEnv() {
  const out = {};
  try {
    for (const line of readFileSync(".env.test.local", "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && !line.trim().startsWith("#")) out[m[1]] = m[2];
    }
  } catch {}
  return out;
}

const env = { ...loadEnv(), ...process.env };
const sqlPath = process.argv[2];
if (!sqlPath) {
  console.error("usage: node scripts/migrate-phase.mjs <sql-file>");
  process.exit(1);
}
const sql = readFileSync(sqlPath, "utf8");

const client = new pg.Client({
  host: env.SUPA_DB_HOST,
  port: Number(env.SUPA_DB_PORT ?? 5432),
  user: `postgres.${env.SUPA_DB_REF}`,
  password: env.SUPA_DB_PW,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15_000,
});

const main = async () => {
  await client.connect();
  await client.query(sql);
  console.log("✅ migration applied");
  await client.end();
};
main().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
