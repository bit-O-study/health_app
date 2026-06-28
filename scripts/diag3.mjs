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
const EMAIL = process.argv[2] ?? "bong9468@naver.com";
const u = await c.query(`select id from auth.users where lower(email)=lower($1)`, [EMAIL]);
if (u.rows.length === 0) { console.log("계정 없음:", EMAIL); await c.end(); process.exit(0); }
const uid = u.rows[0].id;
console.log("EMAIL:", EMAIL, "user_id:", uid);
const r = await c.query(`select splits, variant_id, custom_week, start_date, day_index_migrated, override_date, override_block, rest_date from public.user_routines where user_id=$1`, [uid]);
console.log("routine:", JSON.stringify(r.rows[0]));
const ex = await c.query(`select id, day_index, focus, position, exercise_id from public.routine_exercises where user_id=$1 order by focus, day_index, position`, [uid]);
console.log("routine_exercises 총", ex.rows.length, "행:");
for (const row of ex.rows) console.log(`  d${row.day_index} ${row.focus} #${row.position} ${row.exercise_id}  id=${row.id.slice(0,8)}`);
await c.end();