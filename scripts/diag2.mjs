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
const c = new pg.Client({ host: env.SUPA_DB_HOST, port: Number(env.SUPA_DB_PORT ?? 5432), user: `postgres.${env.SUPA_DB_REF}`, password: env.SUPA_DB_PW, database: "postgres", ssl: { rejectUnauthorized: false } });
await c.connect();
const uid = (await c.query(`select id from auth.users where lower(email)=lower('bong94688@gmail.com')`)).rows[0].id;
const cond = await c.query(`select focus, kind, position, item_id from public.routine_conditioning where user_id=$1 and (focus='lower' or kind is not null) order by focus, kind, position`, [uid]);
console.log("== routine_conditioning (lower 관련 + 전체)", cond.rows.length, "행 ==");
for (const r of cond.rows) console.log(`  ${r.focus}/${r.kind} #${r.position} ${r.item_id}`);
const low = await c.query(`select day_index, exercise_id, position, id from public.routine_exercises where user_id=$1 and focus='lower' order by day_index, position`, [uid]);
console.log("== lower 본운동 ==");
for (const r of low.rows) console.log(`  d${r.day_index} #${r.position} ${r.exercise_id} id=${r.id.slice(0,8)}`);
// daily_plan (오늘만 변경) 도 확인
const dp = await c.query(`select for_date, focus, position, exercise_id from public.daily_plan where user_id=$1 order by for_date, focus, position`, [uid]);
console.log("== daily_plan (오늘만 변경)", dp.rows.length, "행 ==");
for (const r of dp.rows) console.log(`  ${r.for_date} ${r.focus} #${r.position} ${r.exercise_id}`);
await c.end();
