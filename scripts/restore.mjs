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
const ex = await c.query(`select 1 from public.routine_conditioning where user_id=$1 and focus='lower' and kind='warmup' and item_id='bw-squat'`, [uid]);
if (ex.rows.length === 0) {
  await c.query(`insert into public.routine_conditioning (user_id, focus, kind, position, item_id, duration_min) values ($1,'lower','warmup',3,'bw-squat',2)`, [uid]);
  console.log("복구함: lower/warmup bw-squat 재등록");
} else {
  console.log("이미 존재 - 복구 불필요");
}
const w = await c.query(`select position, item_id from public.routine_conditioning where user_id=$1 and focus='lower' and kind='warmup' order by position`, [uid]);
console.log("lower/warmup 현재:", JSON.stringify(w.rows));
await c.end();
