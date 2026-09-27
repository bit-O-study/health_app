import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * 트레이너 처방 두 축(영구 루틴 / 오늘만)의 **DDL 가드** — 오프라인 정적 검사.
 *
 * 🔴 원칙 #2 를 지키는 곳은 결국 SQL 한 줄이다. "오늘만" 함수가 `routine_exercises`
 *    를 한 번만 써도 회원의 영구 루틴이 바뀌고, 내일부터도 그 운동이 남는다.
 *    사람이 리뷰로만 막기엔 너무 조용한 실수라 여기서 기계로 막는다.
 * 🔴 반대 방향도 같다 — 영구 루틴 함수가 `daily_plan` 을 건드리면 회원이 오늘 직접
 *    담아 둔 계획을 트레이너가 지운다.
 */
const schema = readFileSync(resolve(process.cwd(), "supabase/schema.sql"), "utf8");
const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/202609200003_trainer_today_prescription.sql"),
  "utf8",
);

const body = (sql: string, name: string) =>
  sql.match(
    new RegExp(`create or replace function public\\.${name}\\([\\s\\S]*?\\$fn\\$;`, "i"),
  )?.[0] ?? "";

const todayFn = body(schema, "trainer_prescribe_today");
const routineFn = body(schema, "trainer_prescribe_exercise");
const todayPlanFn = body(schema, "trainer_member_today_plan");
const validFn = body(schema, "valid_prescription_patch");

describe("오늘만 처방 DDL", () => {
  it("schema.sql 과 마이그레이션에 모두 있다(둘 중 하나만 있으면 prod 에 빵꾸)", () => {
    for (const name of [
      "trainer_prescribe_today",
      "trainer_member_today_plan",
      "valid_prescription_patch",
    ]) {
      expect(schema).toContain(`create or replace function public.${name}`);
      expect(migration).toContain(`create or replace function public.${name}`);
    }
  });

  it("오늘만 함수는 routine_exercises·user_routines 를 쓰지 않는다(원칙 #2)", () => {
    expect(todayFn).not.toBe("");
    for (const write of [
      "update public.routine_exercises",
      "delete from public.routine_exercises",
      "insert into public.routine_exercises",
      "update public.user_routines",
      "delete from public.user_routines",
      "insert into public.user_routines",
      "update public.routine_conditioning",
      "delete from public.routine_conditioning",
    ]) {
      expect(todayFn.toLowerCase()).not.toContain(write);
    }
    // 읽기는 필요하다 — 아직 고정 안 된 부위를 루틴에서 복사해 와야 오늘 계획이 완성된다.
    expect(todayFn).toContain("from public.routine_exercises");
    expect(todayFn).toContain("insert into public.daily_plan");
  });

  it("영구 루틴 함수는 daily_plan 을 건드리지 않는다", () => {
    expect(routineFn).not.toBe("");
    for (const write of [
      "update public.daily_plan",
      "delete from public.daily_plan",
      "insert into public.daily_plan",
    ]) {
      expect(routineFn.toLowerCase()).not.toContain(write);
    }
  });

  it("두 축 모두 회원의 '처방 허용' 동의를 확인한다", () => {
    for (const fn of [todayFn, routineFn, todayPlanFn]) {
      expect(fn).toContain("member_shares(p_member, p_group_id, 'prescription')");
    }
  });

  it("자기 자신·남의 그룹은 거절하고 그룹장만 통과", () => {
    for (const fn of [todayFn, routineFn, todayPlanFn]) {
      expect(fn).toContain("p_member = auth.uid()");
      expect(fn).toContain("owner_id = auth.uid()");
      expect(fn).toContain("public.group_members");
    }
  });

  it("검증은 한 곳(valid_prescription_patch)에서만 한다", () => {
    expect(validFn).toContain("'barbell'");
    // 두 축 모두 공용 검증을 부른다 — 기구 목록이 한쪽만 늘어나는 일이 없게.
    expect(todayFn).toContain("public.valid_prescription_patch(p_patch)");
    expect(routineFn).toContain("public.valid_prescription_patch(p_patch)");
  });

  it("anon 실행권한을 회수하고 authenticated 에게만 준다", () => {
    for (const sig of [
      "public.trainer_prescribe_today(uuid, uuid, text, int, text, jsonb, text)",
      "public.trainer_member_today_plan(uuid, uuid)",
      "public.valid_prescription_patch(jsonb)",
    ]) {
      expect(schema).toContain(`revoke all on function ${sig} from public, anon;`);
      expect(schema).toContain(`grant execute on function ${sig} to authenticated;`);
    }
  });

  it("오늘 날짜는 서울 기준이다(트레이너 브라우저 시간대를 믿지 않는다)", () => {
    for (const fn of [todayFn, todayPlanFn]) {
      expect(fn).toContain("(now() at time zone 'Asia/Seoul')::date");
    }
    // 오늘 날짜를 인자로 받지 않는다 — 받으면 과거/미래 날짜를 밀어 넣을 수 있다.
    expect(todayFn).not.toContain("p_for_date");
  });

  it("휴식일·부위 교체일에는 루틴에서 복사하지 않는다", () => {
    expect(todayFn).toContain("r.rest_date is not distinct from today");
    expect(todayFn).toContain("r.override_date is not distinct from today");
  });

  // 🔴 실제로 터진 버그: `rest_date = today` 는 rest_date 가 NULL 인 **평범한 날**에
  //    NULL 을 내고, 뒤의 `not is_rest` 가 NULL 이 되어 오늘 운동이 통째로 사라졌다.
  //    (PGlite 검증 `tools/testing/verify-trainer-today-prescription.mjs` 가 잡았다.)
  it("휴식일·교체일 비교는 null-safe 여야 한다", () => {
    for (const fn of [todayFn, todayPlanFn]) {
      expect(fn).not.toMatch(/r\.rest_date\s*=\s*today/);
      expect(fn).not.toMatch(/r\.override_date\s*=\s*today/);
    }
  });
});
