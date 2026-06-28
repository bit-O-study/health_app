import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import pg from "pg";
const here = dirname(fileURLToPath(import.meta.url));
const env = {};
for (const line of readFileSync(resolve(here, "../.env.test.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
  if (m && !line.trim().startsWith("#")) env[m[1]] = m[2];
}
const c = new pg.Client({ host: env.SUPA_DB_HOST, port: Number(env.SUPA_DB_PORT ?? 5432), user: `postgres.${env.SUPA_DB_REF}`, password: env.SUPA_DB_PW, database: "postgres", ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 });
await c.connect();
await c.query(`alter table public.profiles add column if not exists hide_exercise_videos boolean not null default false`);
const r = await c.query(`select column_name, data_type, column_default from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='hide_exercise_videos'`);
console.log("applied:", JSON.stringify(r.rows));
await c.end();
