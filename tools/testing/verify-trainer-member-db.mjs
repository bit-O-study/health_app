// Isolated PostgreSQL/PLpgSQL regression checks. No service credentials or live data.
// npm install --prefix .verify-shots/trainer-validation --ignore-scripts @electric-sql/pglite
// node tools/testing/verify-trainer-member-db.mjs
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "../../.verify-shots/trainer-validation/node_modules/@electric-sql/pglite/dist/index.js";
const db = new PGlite();
let checks = 0;
const check = (actual, expected, name) => { assert.deepEqual(actual, expected, name); checks++; console.log(`PASS ${name}`); };
const trainer = "00000000-0000-0000-0000-000000000001";
const member = "00000000-0000-0000-0000-000000000002";
const stranger = "00000000-0000-0000-0000-000000000003";
const group = "00000000-0000-0000-0000-000000000004";
const row = "00000000-0000-0000-0000-000000000005";
const otherRow = "00000000-0000-0000-0000-000000000006";
const originalVersion = "2026-09-20T01:00:00Z";
try {
  // Minimal existing table contracts used by the migration. RLS denies ordinary reads/writes.
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as
      $$ select (nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'sub')::uuid $$;
    grant usage on schema auth to authenticated, anon;
    create table public.groups (id uuid primary key, owner_id uuid);
    create table public.group_members (group_id uuid, user_id uuid, display_name text);
    create table public.profiles (user_id uuid, name text, nickname text);
    create table public.routine_exercises (id uuid primary key, user_id uuid, day_index int, focus text,
      position int, exercise_id text, equipment text, sets int check(sets between 1 and 20),
      reps int check(reps between 1 and 100), weight_kg numeric(5,1), set_details jsonb, updated_at timestamptz);
    create table public.exercise_completions (user_id uuid, exercise_row_id uuid, for_date date, exercise_id text,
      status text, sets int, reps int, weight_kg numeric(5,1), set_details jsonb);
    create table public.conditioning_completions (user_id uuid, for_date date, status text);
    create table public.workout_sessions (user_id uuid, for_date date, duration_sec int);
    create table public.food_logs (user_id uuid, for_date date);
    create table public.weight_logs (user_id uuid, created_at timestamptz, weight_kg numeric(5,1));
    create table public.trainer_comments (group_id uuid, trainer_id uuid, member_id uuid, body text);
    alter table public.routine_exercises enable row level security;
    grant select, update, delete on public.routine_exercises to authenticated;
    insert into groups values ('${group}', '${trainer}');
    insert into group_members values ('${group}', '${trainer}', '트레이너'), ('${group}', '${member}', '회원');
    insert into routine_exercises values ('${row}', '${member}', 0, 'lower', 0, 'squat', 'barbell', 3, 10, 20, '[{"weightKg":20,"reps":10}]', '${originalVersion}'),
      ('${otherRow}', '${stranger}', 0, 'lower', 0, 'squat', 'barbell', 3, 10, 20, null, '${originalVersion}');
    insert into exercise_completions values ('${member}', '${row}', '2026-09-20', 'squat', 'done', 3, 10, 20, null),
      ('${member}', '${row}', '2026-09-19', 'squat', 'skipped', 3, 10, 20, null);
    insert into conditioning_completions values ('${member}', '2026-09-20', 'done');
    insert into workout_sessions values ('${member}', '2026-09-20', 1200);
    insert into food_logs values ('${member}', '2026-09-20'), ('${member}', '2026-09-20');
    insert into weight_logs values ('${member}', '2026-08-31T14:59:59Z', 99),
      ('${member}', '2026-08-31T15:00:00Z', 70), ('${member}', '2026-09-30T14:59:59Z', 69), ('${member}', '2026-09-30T15:00:00Z', 98);
  `);
  // Reuse the actual consent contract instead of always granting access.
  const schema = await readFile(new URL("../../supabase/schema.sql", import.meta.url), "utf8");
  const prefs = schema.match(/create table if not exists public\.member_share_prefs \([\s\S]*?\n\);/);
  const shares = schema.match(/create or replace function public\.member_shares\([\s\S]*?\n\$\$;/);
  assert.ok(prefs && shares, "consent schema definitions must exist");
  // The isolated fixture has no Auth tables; only omit foreign keys.
  await db.exec(prefs[0].replace(/ references (?:auth\.users|public\.groups)\(id\) on delete cascade/g, ""));
  await db.exec(shares[0]);
  for (const table of ["daily_plan", "daily_conditioning"]) {
    await db.exec(`create table ${table} (user_id uuid, for_date date, exercises jsonb)`);
    await db.query(`insert into ${table} values ($1, '2026-09-20', '[{"exercise_id":"squat"}]')`, [member]);
  }
  const migration = await readFile(new URL("../../supabase/migrations/202609200001_trainer_member_management.sql", import.meta.url), "utf8");
  await db.exec(migration);
  await db.exec(migration); // idempotent application
  async function asUser(uid, sql, params = [], role = "authenticated") {
    await db.exec(`set role ${role}`);
    try {
      await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify({ sub: uid, role })]);
      return await db.query(sql, params);
    } finally { await db.exec("reset role"); }
  }
  async function report(uid, from = "2026-09-01", to = "2026-09-30") {
    return (await asUser(uid, "select trainer_member_report($1, $2, $3, $4) as result", [group, member, from, to])).rows[0].result;
  }
  const data = await report(trainer);
  check(data.completions.length, 1, "only done completions included");
  check(data.diet.length, 1, "diet dates deduplicated");
  check(data.weights.map(w => Number(w.weight_kg)), [70, 69], "Seoul month boundaries exclude adjacent months");
  check(data.exercises.length, 1, "only assigned member routine returned");
  check(await report(member), null, "ordinary member denied report");
  check(await report(stranger), null, "outsider denied report");
  await assert.rejects(() => report(trainer, "2026-01-01", "2027-01-02")); checks++;
  check((await report(trainer, "2028-01-01", "2028-12-31")).completions.length, 0, "leap-year range accepted");
  await assert.rejects(() => asUser(null, "select trainer_member_report($1,$2,$3,$4)", [group, member, "2026-09-01", "2026-09-30"], "anon")); checks++;
  const patch = { exerciseId: "squat", equipment: "barbell", sets: 4, reps: 8, weightKg: 25 };
  async function prescribe(uid, value, id = row, version = originalVersion) {
    return (await asUser(uid, "select trainer_prescribe_exercise($1,$2,$3,$4,$5,$6) as result", [group, member, id, version, value === null ? null : JSON.stringify(value), "운동 처방 변경"])).rows[0].result;
  }
  for (const [column, kind, arrays] of [
    ["share_workout", "workout", ["completions", "conditioning", "sessions"]],
    ["share_diet", "diet", ["diet"]],
    ["share_body", "body", ["weights"]],
    ["allow_prescription", "prescription", ["exercises"]],
  ]) {
    await db.query(`insert into member_share_prefs (user_id, group_id, ${column}) values ($1, $2, false)`, [member, group]);
    const hidden = await report(trainer);
    check(hidden.sharing[kind], false, `${kind} consent reflected`);
    for (const key of arrays) check(hidden[key], [], `${key} hidden when consent withdrawn`);
    for (const key of ["completions", "diet", "weights", "exercises"].filter(key => !arrays.includes(key))) {
      check(hidden[key], data[key], `${kind} withdrawal preserves unrelated ${key}`);
    }
    if (kind === "prescription") {
      check(await prescribe(trainer, patch), false, "withdrawn consent blocks update");
      check(await prescribe(trainer, null), false, "withdrawn consent blocks delete");
      check((await db.query("select count(*)::int as n from trainer_comments")).rows[0].n, 0, "denied prescription leaves no comment");
    }
    await db.query("delete from member_share_prefs where user_id=$1 and group_id=$2", [member, group]);
  }
  check(await prescribe(member, patch), false, "member cannot act as trainer");
  check(await prescribe(stranger, null), false, "outsider cannot delete");
  check(await prescribe(trainer, patch, otherRow), false, "foreign exercise row denied");
  check(await prescribe(trainer, patch, row, "2026-09-19T00:00:00Z"), false, "stale version denied");
  check(await prescribe(trainer, patch, row, null), false, "missing version denied");
  for (const invalid of [{ ...patch, sets: 21 }, { ...patch, sets: 1.5 }, { ...patch, reps: null }, { ...patch, weightKg: -1 }, { ...patch, weightKg: 2.22 }, { ...patch, equipment: null }]) {
    await assert.rejects(() => prescribe(trainer, invalid)); checks++;
  }
  check((await asUser(trainer, "select * from routine_exercises")).rows.length, 0, "no broad direct RLS read granted");
  check(await prescribe(trainer, patch), true, "owner updates prescription");
  const edited = (await db.query("select * from routine_exercises where user_id=$1", [member])).rows[0];
  check([edited.sets, edited.reps, Number(edited.weight_kg), edited.set_details], [4, 8, 25, null], "uniform prescription replaces per-set data");
  check(await prescribe(trainer, patch), false, "old version cannot overwrite new edit");
  check(await prescribe(trainer, { ...patch, exerciseId: "leg-press", equipment: "machine" }, row, edited.updated_at), true, "exercise can be replaced");
  const replaced = (await db.query("select * from routine_exercises where user_id=$1", [member])).rows[0];
  check(replaced.id !== row, true, "replacement does not inherit completion row identity");
  check(await prescribe(trainer, null, replaced.id, replaced.updated_at), true, "owner deletes assigned member exercise");
  check((await db.query("select count(*)::int as n from routine_exercises where user_id=$1", [member])).rows[0].n, 0, "prescription removed");
  check((await db.query("select count(*)::int as n from exercise_completions where user_id=$1", [member])).rows[0].n, 2, "done and skipped snapshots preserved");
  check((await db.query("select count(*)::int as n from trainer_comments")).rows[0].n, 3, "successful edits and delete each leave audit comment");
  for (const table of ["daily_plan", "daily_conditioning"]) {
    check((await db.query(`select exercises from ${table} where user_id=$1`, [member])).rows[0].exercises,
      [{ exercise_id: "squat" }], `${table} preserved after prescription changes`);
  }
  await db.query("delete from group_members where user_id=$1", [member]);
  check(await report(trainer), null, "former member report denied");
  check(await prescribe(trainer, null), false, "former member prescription denied");
  console.log(`${checks} PostgreSQL checks passed`);
} finally { await db.close(); }
