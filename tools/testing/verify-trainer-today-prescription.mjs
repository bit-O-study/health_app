// 트레이너 '오늘만' 처방(202609200003) 의 **실행 검증** — 진짜 Postgres(PGlite) 에서 돌린다.
//
// 🔴 이게 잡은 실제 버그: `rest_date = today` 는 rest_date 가 NULL 인 평범한 날 결과가
//    NULL 이 되고, `not is_rest` 가 NULL 이 되어 **오늘 운동이 통째로 사라졌다**.
//    정적 검사(tests/be/logic/trainer-prescription-schema.test.ts)로는 절대 안 잡힌다.
//
// npm install --prefix .verify-shots/trainer-validation --ignore-scripts @electric-sql/pglite
// node tools/testing/verify-trainer-today-prescription.mjs
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "../../.verify-shots/trainer-validation/node_modules/@electric-sql/pglite/dist/index.js";

const ROOT = new URL("../../", import.meta.url);
const db = new PGlite();
let checks = 0;
const check = (actual, expected, name) => {
  assert.deepEqual(actual, expected, name);
  checks++;
  console.log(`PASS ${name}`);
};

const trainer = "00000000-0000-0000-0000-000000000001";
const member = "00000000-0000-0000-0000-000000000002";
const stranger = "00000000-0000-0000-0000-000000000003";
const group = "00000000-0000-0000-0000-000000000004";

try {
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as
      $$ select (nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'sub')::uuid $$;
    grant usage on schema auth to authenticated, anon;
    create table public.groups (id uuid primary key, owner_id uuid);
    create table public.group_members (group_id uuid, user_id uuid, display_name text);
    create table public.profiles (user_id uuid, name text, nickname text);
    create table public.user_routines (user_id uuid primary key, splits int, variant_id text,
      custom_week jsonb, start_date date, rest_date date, override_date date, override_block text);
    create table public.routine_exercises (id uuid primary key default gen_random_uuid(), user_id uuid,
      day_index int, focus text, position int, exercise_id text, equipment text,
      sets int check(sets between 1 and 20), reps int check(reps between 1 and 100),
      weight_kg numeric(5,1), set_details jsonb, memo text, superset_group smallint, updated_at timestamptz);
    create table public.daily_plan (id uuid primary key default gen_random_uuid(), user_id uuid,
      for_date date, focus text, position int default 0, exercise_id text, equipment text,
      sets int default 3 check(sets between 1 and 20), reps int default 10 check(reps between 1 and 100),
      weight_kg numeric(5,1), set_details jsonb, memo text, superset_group smallint);
    create table public.trainer_comments (group_id uuid, trainer_id uuid, member_id uuid, body text,
      created_at timestamptz default now());
    insert into groups values ('${group}', '${trainer}');
    insert into group_members values ('${group}', '${trainer}', 'T'), ('${group}', '${member}', 'M');
  `);

  const schema = await readFile(new URL("supabase/schema.sql", ROOT), "utf8");
  const prefs = schema.match(/create table if not exists public\.member_share_prefs \([\s\S]*?\n\);/);
  const shares = schema.match(/create or replace function public\.member_shares\([\s\S]*?\n\$\$;/);
  assert.ok(prefs && shares, "consent schema must exist");
  await db.exec(prefs[0].replace(/ references (?:auth\.users|public\.groups)\(id\) on delete cascade/g, ""));
  await db.exec(shares[0]);

  const migration = await readFile(new URL("supabase/migrations/202609200003_trainer_today_prescription.sql", ROOT), "utf8");
  // trainer_prescribe_exercise 는 routine_exercises RLS 전제라 이 픽스처엔 없지만, DDL 은 그대로 돈다.
  await db.exec(migration);
  await db.exec(migration); // 멱등 적용
  console.log("PASS migration applies (idempotent)");
  checks += 1;

  const asUser = async (uid, sql, params = [], role = "authenticated") => {
    await db.exec(`set role ${role}`);
    try {
      await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify({ sub: uid, role })]);
      return await db.query(sql, params);
    } finally {
      await db.exec("reset role");
    }
  };
  const todayYmd = (await db.query(
    "select to_char((now() at time zone 'Asia/Seoul')::date, 'YYYY-MM-DD') d")).rows[0].d;

  // 오늘이 0일차가 되도록 루틴 시작일을 오늘로.
  await db.query(
    `insert into user_routines (user_id, splits, variant_id, start_date) values ($1, 3, 'ppl', $2)`,
    [member, todayYmd],
  );
  await db.query(
    `insert into routine_exercises (user_id, day_index, focus, position, exercise_id, equipment, sets, reps, weight_kg, memo, updated_at)
     values ($1,0,'chest',0,'bench','barbell',3,10,40,'메모',now()),
            ($1,0,'chest',1,'fly','dumbbell',3,12,null,null,now()),
            ($1,0,'back',0,'row','barbell',4,8,50,null,now()),
            ($1,1,'lower',0,'squat','barbell',5,5,80,null,now())`,
    [member],
  );

  const plan = async (uid) =>
    (await asUser(uid, "select trainer_member_today_plan($1,$2) as r", [group, member])).rows[0].r;

  const p = await plan(trainer);
  check(p.rows.length, 3, "오늘(0일차) 운동 3개만 — 1일차는 빠진다");
  check(p.rows.map((r) => `${r.focus}:${r.position}:${r.source}`),
    ["back:0:routine", "chest:0:routine", "chest:1:routine"], "부위·position 순, 아직 루틴 그대로");
  check(p.rest, false, "휴식일 아님");
  check(await plan(member), null, "회원 본인은 못 본다");
  check(await plan(stranger), null, "외부인은 못 본다");

  const prescribe = async (uid, focus, position, expected, patch) =>
    (await asUser(uid, "select trainer_prescribe_today($1,$2,$3,$4,$5,$6,$7) as r", [
      group, member, focus, position, expected, patch === null ? null : JSON.stringify(patch), "처방 코멘트",
    ])).rows[0].r;

  const patch = { exerciseId: "incline", equipment: "dumbbell", sets: 4, reps: 8, weightKg: 22.5 };
  check(await prescribe(member, "chest", 0, "bench", patch), false, "회원 본인은 처방 못 한다");
  check(await prescribe(stranger, "chest", 0, "bench", patch), false, "외부인은 처방 못 한다");
  check(await prescribe(trainer, "chest", 0, "WRONG", patch), false, "본 것과 다른 운동이면 거절");
  check(await prescribe(trainer, "chest", 0, "bench", patch), true, "그룹장은 처방 성공");

  // 🔴 원칙 #2 — 영구 루틴은 그대로여야 한다.
  const routine = (await db.query(
    `select focus, position, exercise_id, sets from routine_exercises where user_id=$1 order by day_index, focus, position`,
    [member])).rows;
  check(routine.map((r) => `${r.focus}:${r.position}:${r.exercise_id}:${r.sets}`),
    ["back:0:row:4", "chest:0:bench:3", "chest:1:fly:3", "lower:0:squat:5"],
    "🔴 영구 루틴 무변경(원칙 #2)");

  // 부위 전체가 오늘 계획으로 고정됐는가(가슴 2줄 모두).
  const daily = (await db.query(
    `select focus, position, exercise_id, equipment, sets, reps, weight_kg, memo
       from daily_plan where user_id=$1 order by focus, position`, [member])).rows;
  check(daily.map((r) => `${r.focus}:${r.position}:${r.exercise_id}:${r.sets}`),
    ["chest:0:incline:4", "chest:1:fly:3"], "가슴 부위 통째 고정 + 대상 줄만 변경");
  check(daily[1].memo, null, "복사된 줄의 메모는 원본 그대로(여기선 null)");
  check(daily[0].memo, "메모", "바꾼 줄의 메모는 보존된다");
  check(Number(daily[0].weight_kg), 22.5, "중량 반영");

  // 등 부위는 아직 루틴 그대로 → 조회 결과가 섞여 나온다.
  const p2 = await plan(trainer);
  check(p2.rows.map((r) => `${r.focus}:${r.exercise_id}:${r.source}`),
    ["back:row:routine", "chest:incline:daily", "chest:fly:daily"], "고정된 부위만 daily 로 표시");

  // 코멘트가 남는다.
  check((await db.query("select count(*)::int n from trainer_comments")).rows[0].n, 1, "처방 코멘트 1건");

  // 삭제
  check(await prescribe(trainer, "chest", 1, "fly", null), true, "오늘만 운동 삭제 성공");
  check((await db.query("select count(*)::int n from daily_plan where user_id=$1", [member])).rows[0].n, 1,
    "삭제 후 가슴 1줄");
  check((await db.query("select count(*)::int n from routine_exercises where user_id=$1", [member])).rows[0].n, 4,
    "🔴 삭제해도 영구 루틴은 4줄 그대로");

  // 잘못된 패치는 예외
  await assert.rejects(() => prescribe(trainer, "back", 0, "row", { ...patch, sets: 0 }));
  await assert.rejects(() => prescribe(trainer, "back", 0, "row", { ...patch, equipment: "rocket" }));
  await assert.rejects(() => prescribe(trainer, "back", 0, "row", { ...patch, weightKg: 1.234 }));
  checks += 3;
  console.log("PASS 잘못된 패치 3종 거절");

  // 휴식일이면 거절 + 조회는 rest:true
  await db.query("update user_routines set rest_date=$2 where user_id=$1", [member, todayYmd]);
  check(await prescribe(trainer, "back", 0, "row", patch), false, "휴식일엔 처방 거절");
  check((await plan(trainer)).rest, true, "휴식일 조회는 rest:true");
  check((await plan(trainer)).rows.length, 0, "휴식일엔 줄이 없다");
  await db.query("update user_routines set rest_date=null where user_id=$1", [member]);

  // 회원이 오늘 부위를 갈아끼운 날: 아직 안 고정된 부위는 건드리지 않는다.
  await db.query("update user_routines set override_date=$2, override_block='shoulder' where user_id=$1", [member, todayYmd]);
  check(await prescribe(trainer, "back", 0, "row", patch), false, "부위 교체일엔 루틴에서 복사하지 않는다");
  check((await plan(trainer)).swapped, true, "조회에 swapped:true");
  check((await plan(trainer)).rows.map((r) => r.source), ["daily"], "교체일엔 이미 고정된 줄만 보인다");
  // 이미 고정된 부위는 교체일에도 고칠 수 있다(회원 선택을 덮어쓰지 않으므로).
  check(await prescribe(trainer, "chest", 0, "incline", { ...patch, sets: 6 }), true,
    "이미 고정된 부위는 교체일에도 처방 가능");
  await db.query("update user_routines set override_date=null where user_id=$1", [member]);

  // 동의를 끄면 둘 다 막힌다.
  await db.query(
    `insert into member_share_prefs (user_id, group_id, allow_prescription) values ($1,$2,false)`,
    [member, group]);
  check(await plan(trainer), null, "처방 미동의면 조회도 null");
  check(await prescribe(trainer, "chest", 0, "incline", patch), false, "처방 미동의면 처방 거절");

  // anon 은 아예 못 부른다.
  await assert.rejects(() => asUser(null, "select trainer_prescribe_today($1,$2,$3,$4,$5,$6,$7)",
    [group, member, "chest", 0, "incline", JSON.stringify(patch), "n"], "anon"));
  await assert.rejects(() => asUser(null, "select trainer_member_today_plan($1,$2)", [group, member], "anon"));
  checks += 2;
  console.log("PASS anon 실행 거절");

  console.log(`\nALL PASS (${checks} checks)`);
} finally {
  await db.close();
}
