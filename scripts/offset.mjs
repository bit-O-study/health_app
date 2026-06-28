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
// app logic copy
function ymdToEpochDay(ymd){const [y,m,d]=ymd.split("-").map(Number);return Math.floor(Date.UTC(y,m-1,d)/86400000);}
function routineDayOffset(anchor,date){const diff=ymdToEpochDay(date)-ymdToEpochDay(anchor);return ((diff%7)+7)%7;}
function seoulYmd(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());}
const today = seoulYmd();
for (const EMAIL of ["bong9468@naver.com","bong94688@gmail.com"]) {
  const u = await c.query(`select id from auth.users where lower(email)=lower($1)`,[EMAIL]);
  if(!u.rows.length){console.log(EMAIL,"없음");continue;}
  const uid=u.rows[0].id;
  const r=await c.query(`select start_date::text as sd, custom_week from public.user_routines where user_id=$1`,[uid]);
  const sd=r.rows[0].sd; const week=r.rows[0].custom_week;
  const off=routineDayOffset(sd,today);
  const tom=routineDayOffset(sd, new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(Date.now()+86400000)));
  console.log(`\n=== ${EMAIL} ===`);
  console.log("start_date(text):",sd,"| today(Seoul):",today);
  console.log("오늘 offset =",off,"-> custom_week[",off,"] =",JSON.stringify(week[off]));
  console.log("내일 offset =",tom,"-> custom_week[",tom,"] =",JSON.stringify(week[tom]));
}
await c.end();
