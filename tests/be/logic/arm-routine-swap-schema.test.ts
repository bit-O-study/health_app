import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const schema = readFileSync(resolve(process.cwd(), "supabase/schema.sql"), "utf8");
const functionSql = schema.match(
  /create or replace function public\.swap_custom_arm_routine\(\s*p_source_day_index integer,\s*p_target_day_index integer,\s*p_expected_custom_week jsonb\s*\) returns void[\s\S]*?\n\$\$;/i,
)?.[0] ?? "";
const accessSql = schema.match(
  /revoke all on function public\.swap_custom_arm_routine\(integer, integer, jsonb\) from public;\s*grant execute on function public\.swap_custom_arm_routine\(integer, integer, jsonb\) to authenticated;/i,
)?.[0] ?? "";

function normalizeSql(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

describe("swap_custom_arm_routine schema contract", () => {
  it("정확한 RPC 시그니처와 실행 메타데이터를 선언한다", () => {
    expect(functionSql).toMatch(
      /^create or replace function public\.swap_custom_arm_routine\(\s*p_source_day_index integer,\s*p_target_day_index integer,\s*p_expected_custom_week jsonb\s*\) returns void\s+language plpgsql\s+security invoker\s+set search_path = public, pg_temp\s+as \$\$/i,
    );
  });

  it("public 실행 권한을 회수하고 authenticated에만 부여한다", () => {
    expect(normalizeSql(accessSql)).toBe(
      "revoke all on function public.swap_custom_arm_routine(integer, integer, jsonb) from public; " +
        "grant execute on function public.swap_custom_arm_routine(integer, integer, jsonb) to authenticated;",
    );
  });

  it("모든 오류 코드를 정확한 철자로 선언한다", () => {
    const errors = [...functionSql.matchAll(
      /raise exception using errcode = 'P0001', message = '([A-Z_]+)';/g,
    )].map((match) => match[1]);

    expect(errors).toEqual([
      "AUTH_REQUIRED",
      "INVALID_DAY",
      "ROUTINE_NOT_FOUND",
      "CUSTOM_ROUTINE_REQUIRED",
      "INVALID_CUSTOM_WEEK",
      "INVALID_CUSTOM_WEEK",
      "STALE_ROUTINE",
      "ARM_SLOT_NOT_FOUND",
      "DAY_BLOCK_LIMIT",
    ]);
  });

  it("인증과 요청 일자 유효성 검사를 각 오류에 연결한다", () => {
    const sql = normalizeSql(functionSql);

    expect(functionSql).toMatch(/declare\s+v_user_id uuid := auth\.uid\(\);/i);
    expect(sql).toContain(
      "if v_user_id is null then raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED'; end if;",
    );
    expect(sql).toContain(
      "if p_source_day_index is null or p_target_day_index is null or p_source_day_index not between 0 and 6 or p_target_day_index not between 0 and 6 or p_source_day_index = p_target_day_index then raise exception using errcode = 'P0001', message = 'INVALID_DAY'; end if;",
    );
  });

  it("현재 사용자의 루틴 행을 잠그고 custom 변형을 요구한다", () => {
    const lockedRoutine = functionSql.match(
      /select variant_id, custom_week[\s\S]*?for update;/i,
    )?.[0] ?? "";
    const sql = normalizeSql(functionSql);

    expect(normalizeSql(lockedRoutine)).toBe(
      "select variant_id, custom_week into v_variant_id, v_raw_week from public.user_routines where user_id = v_user_id for update;",
    );
    expect(sql).toContain(
      "if not found then raise exception using errcode = 'P0001', message = 'ROUTINE_NOT_FOUND'; end if;",
    );
    expect(sql).toContain(
      "if v_variant_id <> 'custom' then raise exception using errcode = 'P0001', message = 'CUSTOM_ROUTINE_REQUIRED'; end if;",
    );
  });

  it("NULL custom_week와 잘못된 주간 구조를 INVALID_CUSTOM_WEEK로 거부한다", () => {
    expect(functionSql).toMatch(
      /if\s+v_raw_week is null\s+or\s+jsonb_typeof\(v_raw_week\) <> 'array'\s+or\s+jsonb_array_length\(v_raw_week\) <> 7\s+then\s+raise exception using errcode = 'P0001', message = 'INVALID_CUSTOM_WEEK';\s+end if;/i,
    );
    expect(functionSql).toMatch(
      /for v_day in select value from jsonb_array_elements\(v_current_week\)\s+loop\s+if jsonb_typeof\(v_day\) <> 'array'[\s\S]*?jsonb_array_length\(v_day\) < 1[\s\S]*?jsonb_array_length\(v_day\) > 3[\s\S]*?jsonb_typeof\(block\.value\) <> 'string'[\s\S]*?\(block\.value #>> '\{\}'\) <> all\(v_valid_ids\)[\s\S]*?message = 'INVALID_CUSTOM_WEEK';\s+end if;\s+end loop;/i,
    );
  });

  it("정규화된 예상 스냅샷이 다르면 STALE_ROUTINE을 반환한다", () => {
    expect(normalizeSql(functionSql)).toContain(
      "if v_current_week is distinct from p_expected_custom_week then raise exception using errcode = 'P0001', message = 'STALE_ROUTINE'; end if;",
    );
  });

  it("정확한 팔 블록 네 개만 교환 대상으로 삼고 양쪽 슬롯을 요구한다", () => {
    const armList = functionSql.match(
      /v_arm_ids constant text\[\] := array\[([\s\S]*?)\];/i,
    )?.[1] ?? "";
    const armIds = [...armList.matchAll(/'([^']+)'/g)].map((match) => match[1]);

    expect(armIds).toEqual(["arm", "biceps", "triceps", "arm-forearm"]);
    expect(functionSql).toMatch(
      /if jsonb_array_length\(v_source_arm\) = 0 or jsonb_array_length\(v_target_arm\) = 0 then\s+raise exception using errcode = 'P0001', message = 'ARM_SLOT_NOT_FOUND';\s+end if;/i,
    );
  });

  it("교환 결과의 일자별 세 블록 제한을 검사한다", () => {
    expect(functionSql).toMatch(
      /if jsonb_array_length\(v_source_day\) > 3 or jsonb_array_length\(v_target_day\) > 3 then\s+raise exception using errcode = 'P0001', message = 'DAY_BLOCK_LIMIT';\s+end if;/i,
    );
  });

  it("현재 사용자의 팔 행에서 day_index만 양방향 교환한다", () => {
    const update = functionSql.match(
      /update public\.routine_exercises\s+set[\s\S]*?;/i,
    )?.[0] ?? "";
    const setClause = update.match(/\bset\s+([\s\S]*?)\s+where\b/i)?.[1] ?? "";
    const whereClause = update.match(/\bwhere\s+([\s\S]*?);/i)?.[1] ?? "";

    expect(normalizeSql(setClause)).toBe(
      "day_index = case when day_index = p_source_day_index then p_target_day_index when day_index = p_target_day_index then p_source_day_index end",
    );
    expect(normalizeSql(whereClause)).toBe(
      "user_id = v_user_id and focus = 'arm' and day_index in (p_source_day_index, p_target_day_index)",
    );
  });

  it("잠근 사용자 루틴의 custom_week만 교환 결과로 갱신한다", () => {
    const update = functionSql.match(
      /update public\.user_routines\s+set custom_week[\s\S]*?;/i,
    )?.[0] ?? "";

    expect(normalizeSql(update)).toBe(
      "update public.user_routines set custom_week = v_next_week where user_id = v_user_id;",
    );
  });
});
