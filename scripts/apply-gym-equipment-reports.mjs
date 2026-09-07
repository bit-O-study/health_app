import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import pg from "pg";

const here = dirname(fileURLToPath(import.meta.url));
const env = {};
for (const line of readFileSync(resolve(here, "../.env.test.local"), "utf8").split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
  if (match && !line.trim().startsWith("#")) env[match[1]] = match[2];
}
const client = new pg.Client({
  host: env.SUPA_DB_HOST,
  port: Number(env.SUPA_DB_PORT ?? 5432),
  user: `postgres.${env.SUPA_DB_REF}`,
  password: env.SUPA_DB_PW,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15_000,
});
await client.connect();

const schema = readFileSync(resolve(here, "../supabase/schema.sql"), "utf8");
const start = schema.indexOf("alter table public.profiles\n  add column if not exists gym_equipment_ids");
const end = schema.indexOf("-- ─────────────────────────────────────────────────────────────\n-- 운동별 미디어", start);
if (start < 0 || end < 0) throw new Error("gym equipment schema block not found");
await client.query(schema.slice(start, end));

console.log("personal gym equipment reports and union trigger ready");
await client.end();
