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
// what data type is start_date?
const col = await c.query(`select data_type from information_schema.columns where table_schema='public' and table_name='user_routines' and column_name='start_date'`);
console.log("start_date column type:", col.rows[0]?.data_type);
const EMAIL = process.argv[2] ?? "bong9468@naver.com";
const uid = (await c.query(`select id from auth.users where lower(email)=lower($1)`,[EMAIL])).rows[0].id;
// daily_plan (오늘만 변경) for this user
const dp = await c.query(`select for_date, focus, position, exercise_id from public.daily_plan where user_id=$1 order by for_date desc, focus, position`, [uid]);
console.log("daily_plan 행:", dp.rows.length);
for (const r of dp.rows.slice(0,20)) console.log(`  ${r.for_date} ${r.focus} #${r.position} ${r.exercise_id}`);
// start_date raw as date
const sd = await c.query(`select start_date, start_date::date as d, rest_date from public.user_routines where user_id=$1`, [uid]);
console.log("start_date raw:", sd.rows[0].start_date, " ::date =", sd.rows[0].d);
await c.end();
