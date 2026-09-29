import { readFileSync } from "node:fs";
import pg from "pg";

// 2026-09-28 되돌림(사용자 승인): 202609250010/0011 을 운영 DB 에 잘못 적용해
// 202609220002_independent_trainers 가 의도적으로 막은 옛 그룹장-트레이너 RPC 8개와
// "trainer writes comment" 정책이 다시 열렸다. 202609220002 의 396–409행과 똑같이 다시 막는다.
// 데이터는 건드리지 않고, 여러 번 실행해도 결과가 같다.
const env = {};
for (const line of readFileSync(".env.test.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2];
}
const db = new pg.Client({
  host: env.SUPA_DB_HOST, port: Number(env.SUPA_DB_PORT || 5432), user: `postgres.${env.SUPA_DB_REF}`,
  password: env.SUPA_DB_PW, database: "postgres", ssl: { rejectUnauthorized: false },
});
const LEGACY = `('leave_trainer_group','trainer_board','trainer_member_routine','trainer_assign_routine_day','trainer_prescribe_exercise','trainer_member_report','trainer_member_today_plan','trainer_prescribe_today')`;
try {
  await db.connect();
  await db.query(`begin;
do $$ declare f record; begin
 for f in select oid::regprocedure as signature from pg_proc where pronamespace='public'::regnamespace and proname in ${LEGACY} loop
 execute format('revoke all on function %s from public, anon, authenticated',f.signature);
 end loop;
end $$;
drop policy if exists "trainer writes comment" on public.trainer_comments;
notify pgrst, 'reload schema';
commit;`);
  const fns = await db.query(`select p.proname as fn, has_function_privilege('authenticated', p.oid, 'execute') as can from pg_proc p where p.pronamespace='public'::regnamespace and p.proname in ${LEGACY} order by 1`);
  const pol = await db.query(`select count(*)::int as n from pg_policies where schemaname='public' and tablename='trainer_comments' and policyname='trainer writes comment'`);
  console.log(JSON.stringify({ functions: fns.rows, trainer_writes_comment_policy: pol.rows[0].n }));
} catch (e) {
  await db.query("rollback").catch(() => {});
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await db.end();
}
