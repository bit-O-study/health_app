# 팔 루틴 일차 간 교환 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 커스텀 루틴의 두 일차 사이에서 팔 운동 행과 내부 이두·삼두 블록을 원자적으로 교환하고, 운동 등록 화면의 팔 표기를 `팔`로 통일한다.

**Architecture:** 클라이언트와 서버가 공유하는 순수 함수가 팔 블록 추출, 교환 가능 대상, 최대 3블록 제한, `/plan` 표시명을 계산한다. 서버 액션은 현재 루틴과 화면 스냅샷을 검증한 뒤 `SECURITY INVOKER` Postgres RPC를 한 번 호출하고, RPC가 사용자 루틴 행 잠금·오래된 스냅샷 검사·`routine_exercises.day_index`와 `user_routines.custom_week` 교환을 한 트랜잭션으로 수행한다. 클라이언트는 낙관적 변경 없이 성공 후 하드 새로고침한다.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase/Postgres PL/pgSQL, Vitest, Playwright

## Global Constraints

- 기능 범위는 `variant_id = 'custom'`인 커스텀 루틴의 팔 슬롯 교환으로 한정한다.
- `/plan`에서는 `arm`, `biceps`, `triceps`, `arm-forearm` 슬롯을 모두 `팔`로 표시하지만 저장된 `blockIds`는 바꾸지 않는다.
- 기존 `routine_exercises` 행을 삭제·재생성하거나 일괄 백필하지 않고 UUID와 운동 속성을 보존한다.
- 선택한 두 일차의 `focus = 'arm'` 행에서 `day_index`만 바꾸며 워밍업·마무리, `daily_plan`, 완료 기록, `override_*`, `today_added_*` 상태는 수정하지 않는다.
- `routine_exercises.day_index`와 `user_routines.custom_week`는 반드시 단일 DB 트랜잭션에서 함께 성공하거나 함께 롤백한다.
- 화면의 예상 `custom_week`와 잠근 DB 행이 다르면 교환을 거부한다.
- 화면의 어느 운동 슬롯이든 미저장 변경이 있으면 RPC를 호출하지 않는다. 성공 후 하드 새로고침에서 관련 없는 로컬 편집이 유실되는 경로도 차단한다.
- 하루 최대 블록 수는 3개이며 클라이언트 대상 목록과 RPC 양쪽에서 검증한다.
- 새 테이블·컬럼·데이터 마이그레이션·신규 패키지를 추가하지 않는다.

---

## File Map

- Create `src/features/routine/arm-routine-swap.ts`: 팔 블록 판별, 순수 교환 미리보기, 대상 일차 계산, `/plan` 팔 표시명, RPC 오류 메시지 매핑.
- Create `tests/be/logic/arm-routine-swap.test.ts`: 순서·블록 제한·대상 계산·표시명·오류 매핑 단위 테스트.
- Modify `supabase/schema.sql`: 인증 사용자 전용 원자적 `swap_custom_arm_routine` RPC.
- Create `tests/be/logic/arm-routine-swap-schema.test.ts`: RPC의 보안·행 잠금·단일 `CASE` 업데이트·루틴 갱신 계약을 정적 검증.
- Modify `tests/be/schema-sync.test.ts`: 라이브 DB에 정확한 RPC 시그니처가 배포됐는지 확인.
- Modify `src/features/routine/plan-actions.ts`: 입력·현재 루틴·스냅샷을 검증하고 RPC를 호출하는 서버 액션.
- Modify `src/app/plan/page.tsx`: `customWeek` 스냅샷을 `PlanEditor`에 전달.
- Modify `src/features/routine/components/plan-editor.tsx`: 팔 표시 통일, 교환 대상 선택, 미저장 차단, 확인 모달, pending/error/reload 흐름.
- Modify `tests/e2e/plan-editor-multi-focus-add.spec.ts`: 이두 슬롯의 `/plan` 표시 기대값을 `팔`로 갱신하되 내부 필터 동작은 유지.
- Create `tests/e2e/arm-routine-swap.spec.ts`: 실제 UI/RPC를 통해 UUID·속성·완료 기록·비대상 데이터 보존과 stale/dirty 차단을 검증.

---

### Task 1: 팔 슬롯 교환과 표시 규칙을 순수 함수로 고정

**Files:**

- Create: `src/features/routine/arm-routine-swap.ts`
- Create: `tests/be/logic/arm-routine-swap.test.ts`

**Interfaces:**

- Consumes: `DayBlockId`, `DAY_BLOCKS`, `normalizeCustomWeek` from `src/features/routine/data.ts`.
- Produces: `isArmBlockId(blockId)`, `previewArmRoutineSwap(week, sourceDayIndex, targetDayIndex)`, `eligibleArmSwapTargets(week, sourceDayIndex)`, `planFocusDisplayName(focus, label)`, `armSwapRpcErrorMessage(message)`.
- `previewArmRoutineSwap` returns `{ ok: true, nextWeek }` or `{ ok: false, reason }`; later UI and server code must use this exact result instead of duplicating the rules.

- [ ] **Step 1: Write the failing unit tests**

Create `tests/be/logic/arm-routine-swap.test.ts` with concrete cases for label normalization, subtype movement, order preservation, invalid days, missing arm slots, and the three-block cap:

```ts
import { describe, expect, it } from "vitest";

import {
  armSwapRpcErrorMessage,
  eligibleArmSwapTargets,
  planFocusDisplayName,
  previewArmRoutineSwap,
} from "@/features/routine/arm-routine-swap";
import type { DayBlockId } from "@/features/routine/data";

const week = (day0: DayBlockId[], day1: DayBlockId[]): DayBlockId[][] => [
  day0,
  day1,
  ["rest"],
  ["rest"],
  ["rest"],
  ["rest"],
  ["rest"],
];

describe("planFocusDisplayName", () => {
  it.each(["이두", "삼두", "전완", "팔"])('arm 슬롯의 "%s"를 팔로 표시한다', (label) => {
    expect(planFocusDisplayName("arm", `1일 · ${label}`)).toBe("팔");
  });

  it("다른 부위의 세부 라벨은 유지한다", () => {
    expect(planFocusDisplayName("chest", "1일 · 가슴 상부, 가슴 하부")).toBe(
      "가슴 상부, 가슴 하부",
    );
  });
});

describe("previewArmRoutineSwap", () => {
  it("팔 블록 전체를 바꾸고 비팔 블록 순서와 입력을 보존한다", () => {
    const input = week(["back", "biceps"], ["shoulder", "triceps"]);
    expect(previewArmRoutineSwap(input, 0, 1)).toEqual({
      ok: true,
      nextWeek: week(["back", "triceps"], ["shoulder", "biceps"]),
    });
    expect(input).toEqual(week(["back", "biceps"], ["shoulder", "triceps"]));
  });

  it("여러 팔 블록을 한 슬롯 묶음으로 옮긴다", () => {
    const input = week(
      ["back", "biceps", "triceps"],
      ["shoulder", "arm-forearm"],
    );
    expect(previewArmRoutineSwap(input, 0, 1)).toEqual({
      ok: true,
      nextWeek: week(
        ["back", "arm-forearm"],
        ["shoulder", "biceps", "triceps"],
      ),
    });
  });

  it("교환 후 한쪽이 4블록이면 거부하고 대상에서도 제외한다", () => {
    const input = week(
      ["back", "biceps", "triceps"],
      ["chest", "shoulder", "arm-forearm"],
    );
    expect(previewArmRoutineSwap(input, 0, 1)).toEqual({
      ok: false,
      reason: "day-limit",
    });
    expect(eligibleArmSwapTargets(input, 0)).toEqual([]);
  });

  it.each([
    [-1, 1, "invalid-day"],
    [0, 7, "invalid-day"],
    [0, 0, "same-day"],
  ] as const)("잘못된 일차 %s→%s를 %s로 거부한다", (source, target, reason) => {
    expect(previewArmRoutineSwap(week(["back", "biceps"], ["shoulder", "triceps"]), source, target)).toEqual({
      ok: false,
      reason,
    });
  });

  it("팔 슬롯이 없는 일차를 거부한다", () => {
    expect(previewArmRoutineSwap(week(["back"], ["shoulder", "triceps"]), 0, 1)).toEqual({
      ok: false,
      reason: "missing-arm",
    });
  });

  it("교환 가능한 다른 팔 일차만 반환한다", () => {
    const input: DayBlockId[][] = [
      ["back", "biceps"],
      ["shoulder", "triceps"],
      ["lower"],
      ["chest", "arm-forearm"],
      ["rest"],
      ["rest"],
      ["rest"],
    ];
    expect(eligibleArmSwapTargets(input, 0)).toEqual([1, 3]);
  });
});

describe("armSwapRpcErrorMessage", () => {
  it("DB 오류 코드를 사용자 메시지로 제한한다", () => {
    expect(armSwapRpcErrorMessage("STALE_ROUTINE")).toBe(
      "루틴이 다른 곳에서 변경되었습니다. 새로고침 후 다시 시도해주세요.",
    );
    expect(armSwapRpcErrorMessage("ARM_SLOT_NOT_FOUND")).toBe(
      "교환할 팔 루틴을 찾을 수 없습니다.",
    );
    expect(armSwapRpcErrorMessage("raw postgres detail")).toBe(
      "팔 루틴 교환에 실패했습니다.",
    );
  });
});
```

- [ ] **Step 2: Run the targeted test and confirm the missing-module failure**

Run:

```bash
pnpm exec vitest run tests/be/logic/arm-routine-swap.test.ts
```

Expected: FAIL because `@/features/routine/arm-routine-swap` does not exist.

- [ ] **Step 3: Implement the minimal shared domain module**

Create `src/features/routine/arm-routine-swap.ts` with these exact public types and rules:

```ts
import {
  DAY_BLOCKS,
  normalizeCustomWeek,
  type DayBlockId,
  type FocusKey,
} from "@/features/routine/data";

export type ArmSwapFailureReason =
  | "invalid-week"
  | "invalid-day"
  | "same-day"
  | "missing-arm"
  | "day-limit";

export type ArmSwapPreview =
  | { ok: true; nextWeek: DayBlockId[][] }
  | { ok: false; reason: ArmSwapFailureReason };

export function isArmBlockId(blockId: DayBlockId): boolean {
  return DAY_BLOCKS[blockId].day.tone === "arm";
}

function replaceArmBlocks(
  day: readonly DayBlockId[],
  incoming: readonly DayBlockId[],
): DayBlockId[] {
  const firstArm = day.findIndex(isArmBlockId);
  const next = day.filter((blockId) => !isArmBlockId(blockId));
  next.splice(firstArm, 0, ...incoming);
  return next;
}

export function previewArmRoutineSwap(
  rawWeek: unknown,
  sourceDayIndex: number,
  targetDayIndex: number,
): ArmSwapPreview {
  const week = normalizeCustomWeek(rawWeek);
  if (!week) return { ok: false, reason: "invalid-week" };
  if (
    !Number.isInteger(sourceDayIndex) ||
    !Number.isInteger(targetDayIndex) ||
    sourceDayIndex < 0 ||
    sourceDayIndex > 6 ||
    targetDayIndex < 0 ||
    targetDayIndex > 6
  ) {
    return { ok: false, reason: "invalid-day" };
  }
  if (sourceDayIndex === targetDayIndex) {
    return { ok: false, reason: "same-day" };
  }

  const sourceArm = week[sourceDayIndex].filter(isArmBlockId);
  const targetArm = week[targetDayIndex].filter(isArmBlockId);
  if (sourceArm.length === 0 || targetArm.length === 0) {
    return { ok: false, reason: "missing-arm" };
  }

  const nextWeek = week.map((day) => [...day]);
  nextWeek[sourceDayIndex] = replaceArmBlocks(
    week[sourceDayIndex],
    targetArm,
  );
  nextWeek[targetDayIndex] = replaceArmBlocks(
    week[targetDayIndex],
    sourceArm,
  );
  if (
    nextWeek[sourceDayIndex].length > 3 ||
    nextWeek[targetDayIndex].length > 3
  ) {
    return { ok: false, reason: "day-limit" };
  }
  return { ok: true, nextWeek };
}

export function eligibleArmSwapTargets(
  week: unknown,
  sourceDayIndex: number,
): number[] {
  return Array.from({ length: 7 }, (_, dayIndex) => dayIndex).filter(
    (targetDayIndex) =>
      previewArmRoutineSwap(week, sourceDayIndex, targetDayIndex).ok,
  );
}

export function planFocusDisplayName(
  focus: FocusKey,
  label: string,
): string {
  if (focus === "arm") return "팔";
  return label.split(" · ").pop() ?? label;
}

export function armSwapRpcErrorMessage(message: string): string {
  if (message.includes("STALE_ROUTINE")) {
    return "루틴이 다른 곳에서 변경되었습니다. 새로고침 후 다시 시도해주세요.";
  }
  if (message.includes("AUTH_REQUIRED")) return "로그인이 필요합니다.";
  if (message.includes("ARM_SLOT_NOT_FOUND")) {
    return "교환할 팔 루틴을 찾을 수 없습니다.";
  }
  if (message.includes("DAY_BLOCK_LIMIT")) {
    return "하루에는 최대 3개 부위까지만 설정할 수 있습니다.";
  }
  return "팔 루틴 교환에 실패했습니다.";
}
```

- [ ] **Step 4: Run the unit test and focused regressions**

Run:

```bash
pnpm exec vitest run tests/be/logic/arm-routine-swap.test.ts tests/be/logic/day-slots.test.ts tests/be/logic/plan-order.test.ts
```

Expected: all tests PASS; the new function moves `blockIds` without changing `routineDaySlots` or recommendation filters.

- [ ] **Step 5: Commit the domain rule**

```bash
git add src/features/routine/arm-routine-swap.ts tests/be/logic/arm-routine-swap.test.ts
git commit -m "feat: 팔 루틴 교환 규칙 추가"
```

---

### Task 2: 원자적 Supabase RPC 추가

**Files:**

- Modify: `supabase/schema.sql:328-396`
- Create: `tests/be/logic/arm-routine-swap-schema.test.ts`
- Modify: `tests/be/schema-sync.test.ts:49-91`

**Interfaces:**

- Consumes: authenticated `auth.uid()`, `user_routines.custom_week`, `routine_exercises(day_index, focus)`.
- Produces: `public.swap_custom_arm_routine(p_source_day_index integer, p_target_day_index integer, p_expected_custom_week jsonb) returns void`.
- Error contract consumed by the server action: `AUTH_REQUIRED`, `INVALID_DAY`, `ROUTINE_NOT_FOUND`, `CUSTOM_ROUTINE_REQUIRED`, `INVALID_CUSTOM_WEEK`, `STALE_ROUTINE`, `ARM_SLOT_NOT_FOUND`, `DAY_BLOCK_LIMIT`.

- [ ] **Step 1: Write the failing schema contract test**

Create `tests/be/logic/arm-routine-swap-schema.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const schema = readFileSync(resolve(process.cwd(), "supabase/schema.sql"), "utf8");
const rpc = schema.match(
  /create or replace function public\.swap_custom_arm_routine[\s\S]*?grant execute on function public\.swap_custom_arm_routine[\s\S]*?authenticated;/i,
)?.[0] ?? "";

describe("swap_custom_arm_routine schema contract", () => {
  it("인증 사용자에게만 SECURITY INVOKER 함수로 노출한다", () => {
    expect(rpc).toContain("security invoker");
    expect(rpc).toContain("auth.uid()");
    expect(rpc).toContain("revoke all on function");
    expect(rpc).toContain("grant execute on function");
  });

  it("루틴 행을 잠그고 예상 스냅샷을 비교한다", () => {
    expect(rpc).toMatch(/from public\.user_routines[\s\S]*for update/i);
    expect(rpc).toContain("STALE_ROUTINE");
  });

  it("팔 행과 custom_week를 같은 함수에서 갱신한다", () => {
    expect(rpc).toMatch(/update public\.routine_exercises[\s\S]*case/i);
    expect(rpc).toMatch(/focus = 'arm'/i);
    expect(rpc).toMatch(/update public\.user_routines[\s\S]*custom_week/i);
  });
});
```

Inside the existing credential-gated `describe.skipIf(!hasDbCreds)` block in `tests/be/schema-sync.test.ts`, add a live signature check after the sanity test:

```ts
it("function public.swap_custom_arm_routine(integer,integer,jsonb) exists", async () => {
  const result = await client.query(
    `select to_regprocedure(
       'public.swap_custom_arm_routine(integer,integer,jsonb)'
     ) is not null as exists`,
  );
  expect(
    result.rows[0]?.exists,
    "swap_custom_arm_routine RPC missing from live DB",
  ).toBe(true);
});
```

- [ ] **Step 2: Run the schema contract test and confirm it fails**

Run:

```bash
pnpm exec vitest run tests/be/logic/arm-routine-swap-schema.test.ts
```

Expected: FAIL because the RPC block is absent.

- [ ] **Step 3: Add the transactional function after the `routine_exercises` policies**

Append the following idempotent DDL after the policies near `supabase/schema.sql:396`. Keep the arm block list synchronized with `DAY_BLOCKS` entries whose tone is `arm`.

```sql
create or replace function public.swap_custom_arm_routine(
  p_source_day_index integer,
  p_target_day_index integer,
  p_expected_custom_week jsonb
) returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_variant_id text;
  v_raw_week jsonb;
  v_current_week jsonb;
  v_next_week jsonb;
  v_source_arm jsonb;
  v_target_arm jsonb;
  v_source_day jsonb;
  v_target_day jsonb;
  v_day jsonb;
  v_source_first integer;
  v_target_first integer;
  v_arm_ids constant text[] := array['arm', 'biceps', 'triceps', 'arm-forearm'];
  v_valid_ids constant text[] := array[
    'rest', 'fullbody', 'upper', 'lower', 'chest', 'back', 'shoulder',
    'arm', 'push', 'pull', 'core', 'biceps', 'triceps',
    'chest-upper', 'chest-mid', 'chest-lower', 'chest-inner',
    'back-lats', 'back-traps', 'back-rhomboids', 'back-erector',
    'shoulder-front', 'shoulder-side', 'shoulder-rear', 'arm-forearm',
    'lower-quads', 'lower-hamstrings', 'lower-glutes',
    'lower-adductors', 'lower-calves', 'core-upper-abs',
    'core-lower-abs', 'core-obliques'
  ];
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;
  if p_source_day_index is null
     or p_target_day_index is null
     or p_source_day_index not between 0 and 6
     or p_target_day_index not between 0 and 6
     or p_source_day_index = p_target_day_index then
    raise exception using errcode = 'P0001', message = 'INVALID_DAY';
  end if;

  select variant_id, custom_week
    into v_variant_id, v_raw_week
    from public.user_routines
   where user_id = v_user_id
   for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'ROUTINE_NOT_FOUND';
  end if;
  if v_variant_id <> 'custom' then
    raise exception using errcode = 'P0001', message = 'CUSTOM_ROUTINE_REQUIRED';
  end if;
  if jsonb_typeof(v_raw_week) <> 'array' or jsonb_array_length(v_raw_week) <> 7 then
    raise exception using errcode = 'P0001', message = 'INVALID_CUSTOM_WEEK';
  end if;

  select jsonb_agg(
           case
             when jsonb_typeof(item.value) = 'array' then item.value
             else jsonb_build_array(item.value)
           end
           order by item.ordinality
         )
    into v_current_week
    from jsonb_array_elements(v_raw_week) with ordinality as item(value, ordinality);

  for v_day in select value from jsonb_array_elements(v_current_week)
  loop
    if jsonb_typeof(v_day) <> 'array'
       or jsonb_array_length(v_day) < 1
       or jsonb_array_length(v_day) > 3
       or exists (
         select 1
           from jsonb_array_elements(v_day) as block(value)
          where jsonb_typeof(block.value) <> 'string'
             or (block.value #>> '{}') <> all(v_valid_ids)
       ) then
      raise exception using errcode = 'P0001', message = 'INVALID_CUSTOM_WEEK';
    end if;
  end loop;

  if v_current_week is distinct from p_expected_custom_week then
    raise exception using errcode = 'P0001', message = 'STALE_ROUTINE';
  end if;

  select coalesce(jsonb_agg(block.value order by block.ordinality), '[]'::jsonb),
         min(block.ordinality)::integer
    into v_source_arm, v_source_first
    from jsonb_array_elements(v_current_week -> p_source_day_index)
         with ordinality as block(value, ordinality)
   where block.value #>> '{}' = any(v_arm_ids);
  select coalesce(jsonb_agg(block.value order by block.ordinality), '[]'::jsonb),
         min(block.ordinality)::integer
    into v_target_arm, v_target_first
    from jsonb_array_elements(v_current_week -> p_target_day_index)
         with ordinality as block(value, ordinality)
   where block.value #>> '{}' = any(v_arm_ids);

  if jsonb_array_length(v_source_arm) = 0 or jsonb_array_length(v_target_arm) = 0 then
    raise exception using errcode = 'P0001', message = 'ARM_SLOT_NOT_FOUND';
  end if;

  select jsonb_agg(mixed.value order by mixed.sort_order)
    into v_source_day
    from (
      select block.value, block.ordinality::numeric as sort_order
        from jsonb_array_elements(v_current_week -> p_source_day_index)
             with ordinality as block(value, ordinality)
       where not (block.value #>> '{}' = any(v_arm_ids))
      union all
      select block.value,
             v_source_first::numeric + block.ordinality::numeric / 1000
        from jsonb_array_elements(v_target_arm)
             with ordinality as block(value, ordinality)
    ) as mixed;
  select jsonb_agg(mixed.value order by mixed.sort_order)
    into v_target_day
    from (
      select block.value, block.ordinality::numeric as sort_order
        from jsonb_array_elements(v_current_week -> p_target_day_index)
             with ordinality as block(value, ordinality)
       where not (block.value #>> '{}' = any(v_arm_ids))
      union all
      select block.value,
             v_target_first::numeric + block.ordinality::numeric / 1000
        from jsonb_array_elements(v_source_arm)
             with ordinality as block(value, ordinality)
    ) as mixed;

  if jsonb_array_length(v_source_day) > 3 or jsonb_array_length(v_target_day) > 3 then
    raise exception using errcode = 'P0001', message = 'DAY_BLOCK_LIMIT';
  end if;

  v_next_week := jsonb_set(
    jsonb_set(v_current_week, array[p_source_day_index::text], v_source_day),
    array[p_target_day_index::text],
    v_target_day
  );

  update public.routine_exercises
     set day_index = case
       when day_index = p_source_day_index then p_target_day_index
       when day_index = p_target_day_index then p_source_day_index
     end
   where user_id = v_user_id
     and focus = 'arm'
     and day_index in (p_source_day_index, p_target_day_index);

  update public.user_routines
     set custom_week = v_next_week
   where user_id = v_user_id;
end;
$$;

revoke all on function public.swap_custom_arm_routine(integer, integer, jsonb) from public;
grant execute on function public.swap_custom_arm_routine(integer, integer, jsonb) to authenticated;
```

The function intentionally normalizes legacy `DayBlockId[]` days into `DayBlockId[][]` inside the locked transaction; it does not scan or rewrite any other user row.

- [ ] **Step 4: Run local schema tests**

Run:

```bash
pnpm exec vitest run tests/be/logic/arm-routine-swap-schema.test.ts
pnpm test:schema
```

Expected: the contract test PASSes. `test:schema` PASSes when the live test DB has the function deployed; if the function is not deployed yet, apply the idempotent function block through the project’s documented Supabase SQL Editor flow, then rerun.

- [ ] **Step 5: Commit the RPC and contract**

```bash
git add supabase/schema.sql tests/be/logic/arm-routine-swap-schema.test.ts tests/be/schema-sync.test.ts
git commit -m "feat: 팔 루틴 원자 교환 RPC 추가"
```

---

### Task 3: 서버 액션과 운동 등록 UI 연결

**Files:**

- Modify: `src/features/routine/plan-actions.ts:1-280`
- Modify: `src/app/plan/page.tsx:1-115`
- Modify: `src/features/routine/components/plan-editor.tsx:1-690`
- Modify: `tests/e2e/plan-editor-multi-focus-add.spec.ts:18-67`
- Create: `tests/e2e/arm-routine-swap.spec.ts`

**Interfaces:**

- Consumes: Task 1 helpers and Task 2 RPC.
- Produces: `swapArmRoutineAction(sourceDayIndex, targetDayIndex, expectedCustomWeek): Promise<SavePlanResult>`.
- `PlanEditor` gains `customWeek: DayBlockId[][] | null`; `null` means preset routine and hides all swap controls.
- UI test hooks: `data-testid="arm-swap-button-{dayIndex}"`, group name `N일차 팔 루틴 교환 대상`, target button accessible name `M일차 · <부위 + 팔>`.

- [ ] **Step 1: Update the existing display expectation and write the failing happy-path E2E test**

In `tests/e2e/plan-editor-multi-focus-add.spec.ts`, keep the custom week as `['shoulder', 'biceps']` but change the visible choice assertion from `이두 운동 추가` to `팔 운동 추가`. This proves the UI label changes without flattening the stored subtype.

Create `tests/e2e/arm-routine-swap.spec.ts` with a shared seed that:

```ts
const initialWeek = [
  ["back", "biceps"],
  ["shoulder", "triceps"],
  ["rest"],
  ["rest"],
  ["rest"],
  ["rest"],
  ["rest"],
];
const uid = `(select id from auth.users where lower(email)=lower($1))`;

await dbQuery(
  `update public.user_routines
      set splits=0, variant_id='custom', custom_week=$2::jsonb,
          day_index_migrated=true,
          start_date=(now() at time zone 'Asia/Seoul')::date,
          rest_date=null,
          override_date=(now() at time zone 'Asia/Seoul')::date,
          override_block='lower',
          today_added_date=(now() at time zone 'Asia/Seoul')::date,
          today_added_blocks='core-upper-abs'
    where user_id=(select id from auth.users where lower(email)=lower($1))`,
  [email, JSON.stringify(initialWeek)],
);

await dbQuery(
  `insert into public.routine_exercises
     (user_id, day_index, focus, position, exercise_id, equipment,
      sets, reps, weight_kg, set_details, memo)
   values
     (${uid}, 0, 'back', 0, 'lat-pulldown', 'cable', 3, 10, 35, null, '등 유지'),
     (${uid}, 0, 'arm', 4, 'biceps-curl', 'dumbbell', 4, 8, 12,
      '[{"weightKg":12,"reps":8}]'::jsonb, '이두 메모'),
     (${uid}, 1, 'shoulder', 0, 'ohp', 'barbell', 3, 10, 16, null, '어깨 유지'),
     (${uid}, 1, 'arm', 7, 'triceps-pushdown', 'cable', 5, 12, 25,
      '[{"weightKg":25,"reps":12}]'::jsonb, '삼두 메모')`,
  [email],
);
```

The first test must assert:

```ts
await page.goto("/plan", { waitUntil: "networkidle" });
const day0 = page.locator('[data-plan-day-index="0"]');
const day1 = page.locator('[data-plan-day-index="1"]');
await expect(day0).toContainText("등 · 팔");
await expect(day1).toContainText("어깨 · 팔");
await expect(day0.getByText("이두", { exact: true })).toHaveCount(0);
await expect(day1.getByText("삼두", { exact: true })).toHaveCount(0);

await day0.getByTestId("arm-swap-button-0").click();
await day0.getByRole("button", { name: "2일차 · 어깨 + 팔" }).click();
await expect(page.getByRole("dialog")).toContainText(
  "1일차 팔 루틴과 2일차 팔 루틴을 교환할까요?",
);
await page.getByRole("button", { name: "교환하기" }).click();
await page.waitForLoadState("networkidle");
```

Run the two E2E files before implementation and expect failure because the new button/action do not exist:

```bash
pnpm exec playwright test tests/e2e/plan-editor-multi-focus-add.spec.ts tests/e2e/arm-routine-swap.spec.ts
```

- [ ] **Step 2: Add the guarded server action**

In `src/features/routine/plan-actions.ts`, import `CUSTOM_VARIANT_ID`, `normalizeCustomWeek`, `previewArmRoutineSwap`, and `armSwapRpcErrorMessage`, then add:

```ts
export async function swapArmRoutineAction(
  sourceDayIndex: number,
  targetDayIndex: number,
  expectedCustomWeek: DayBlockId[][],
): Promise<SavePlanResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const expected = normalizeCustomWeek(expectedCustomWeek);
  if (!expected) {
    return { ok: false, error: "루틴 데이터가 올바르지 않습니다." };
  }
  const routine = await getUserRoutine();
  if (
    !routine ||
    routine.variantId !== CUSTOM_VARIANT_ID ||
    !routine.customWeek
  ) {
    return { ok: false, error: "커스텀 루틴에서만 교환할 수 있습니다." };
  }
  if (JSON.stringify(routine.customWeek) !== JSON.stringify(expected)) {
    return {
      ok: false,
      error: "루틴이 다른 곳에서 변경되었습니다. 새로고침 후 다시 시도해주세요.",
    };
  }

  const preview = previewArmRoutineSwap(
    routine.customWeek,
    sourceDayIndex,
    targetDayIndex,
  );
  if (!preview.ok) {
    const error =
      preview.reason === "day-limit"
        ? "하루에는 최대 3개 부위까지만 설정할 수 있습니다."
        : "교환할 팔 루틴을 찾을 수 없습니다.";
    return { ok: false, error };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("swap_custom_arm_routine", {
    p_source_day_index: sourceDayIndex,
    p_target_day_index: targetDayIndex,
    p_expected_custom_week: expected,
  });
  if (error) return { ok: false, error: armSwapRpcErrorMessage(error.message) };

  revalidatePath("/plan");
  revalidatePath("/routine");
  revalidatePath("/settings/routine");
  return { ok: true };
}
```

The server computes `preview` only for validation; it never writes `preview.nextWeek` itself. The locked RPC remains the authoritative writer and repeats the safety checks against current DB state.

- [ ] **Step 3: Pass the custom-week snapshot from the server page**

In `src/app/plan/page.tsx`, add the serializable prop:

```tsx
<PlanEditor
  focuses={focuses}
  customWeek={routine.variantId === "custom" ? routine.customWeek : null}
  gender={profile.gender}
  experience={profile.experience}
  bodyType={profile.bodyType}
  weightKg={profile.weightKg}
  gymEquipment={gymEquipment}
  lockWeightReps={profile.lockWeightReps}
/>
```

- [ ] **Step 4: Add label normalization and explicit swap UI to `PlanEditor`**

Update imports with `ArrowLeftRight`, `DayBlockId`, Task 1 helpers, and `swapArmRoutineAction`. Add `customWeek,` immediately after `focuses,` in the destructured parameters and add `customWeek: DayBlockId[][] | null;` immediately after the existing `focuses` prop type. Then add this confirm type outside the component and this state beside `addTargetDayIndex`:

```ts
type ArmSwapConfirm = {
  kind: "arm-swap";
  sourceDayIndex: number;
  targetDayIndex: number;
};

const [swapSourceDayIndex, setSwapSourceDayIndex] = useState<number | null>(
  null,
);
```

Extend the existing `confirm` union with `ArmSwapConfirm`. Replace the label-only helper with focus-aware display:

```ts
const focusName = (focus: FocusData) =>
  planFocusDisplayName(focus.focus, focus.label);
const dayName = (day: DayGroup) =>
  day.focuses.map(focusName).join(" + ");
const armFocus = (dayIndex: number) =>
  focuses.find((focus) => focus.dayIndex === dayIndex && focus.focus === "arm");
```

Use `focusName(f)` in the day header and add-target chooser. The recommendation and direct-add calls must continue using `f.blockIds` unchanged.

Add the guard and action handlers:

```ts
function requestArmSwap(sourceDayIndex: number, targetDayIndex: number) {
  setSwapSourceDayIndex(null);
  const sourceArm = armFocus(sourceDayIndex);
  const targetArm = armFocus(targetDayIndex);
  if (!sourceArm || !targetArm) {
    setStatus("교환할 팔 루틴을 찾을 수 없습니다.");
    return;
  }
  if (dirty.size > 0) {
    setStatus(
      "저장하지 않은 운동 변경이 있습니다. 먼저 각 일차를 저장해주세요.",
    );
    return;
  }
  setConfirm({ kind: "arm-swap", sourceDayIndex, targetDayIndex });
}

function doSwapArmRoutine(sourceDayIndex: number, targetDayIndex: number) {
  if (!customWeek) return;
  setStatus(null);
  start(async () => {
    const result = await swapArmRoutineAction(
      sourceDayIndex,
      targetDayIndex,
      customWeek,
    );
    if (!result.ok) {
      setStatus(result.error);
      return;
    }
    window.location.reload();
  });
}
```

Add a target helper next to `armFocus`:

```ts
const swapTargetsForDay = (dayIndex: number) =>
  customWeek ? eligibleArmSwapTargets(customWeek, dayIndex) : [];
```

Inside the existing day header, change the label call to `focusName(focus)` and add this button. Immediately after the header, add the target group:

```tsx
<div className="flex items-center gap-2 pt-1">
  <span className="inline-flex h-7 items-center rounded-full bg-zinc-900 px-3 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
    {day.dayIndex + 1}일차
  </span>
  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-500 dark:text-zinc-400">
    {day.focuses.map(focusName).join(" · ")}
  </span>
  {swapTargetsForDay(day.dayIndex).length > 0 ? (
    <button
      type="button"
      data-testid={`arm-swap-button-${day.dayIndex}`}
      disabled={pending}
      onClick={() => {
        setAddTargetDayIndex(null);
        setSwapSourceDayIndex((current) =>
          current === day.dayIndex ? null : day.dayIndex,
        );
      }}
      className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-zinc-300 bg-white px-2.5 text-xs font-semibold text-zinc-700 transition hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30"
    >
      <ArrowLeftRight aria-hidden="true" size={14} />
      팔 루틴 교환
    </button>
  ) : null}
</div>

{swapSourceDayIndex === day.dayIndex ? (
  <div
    role="group"
    aria-label={`${day.dayIndex + 1}일차 팔 루틴 교환 대상`}
    className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-700 dark:bg-zinc-900/50"
  >
    <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
      교환할 일차
    </span>
    {swapTargetsForDay(day.dayIndex).map((targetDayIndex) => {
      const targetDay = days.find(
        (candidate) => candidate.dayIndex === targetDayIndex,
      );
      if (!targetDay) return null;
      const name = `${targetDayIndex + 1}일차 · ${dayName(targetDay)}`;
      return (
        <button
          key={targetDayIndex}
          type="button"
          aria-label={name}
          disabled={pending}
          onClick={() => requestArmSwap(day.dayIndex, targetDayIndex)}
          className="rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30"
        >
          {name}
        </button>
      );
    })}
  </div>
) : null}
```

Derive every `ConfirmDialog` value without changing the shared component:

```tsx
const dialogTitle =
  confirm?.kind === "arm-swap"
    ? "팔 루틴을 교환할까요?"
    : confirm?.kind === "clear-all"
      ? "전체 운동을 비울까요?"
      : "추천 운동으로 교체할까요?";
const dialogMessage =
  confirm?.kind === "arm-swap"
    ? `${confirm.sourceDayIndex + 1}일차 팔 루틴과 ${confirm.targetDayIndex + 1}일차 팔 루틴을 교환할까요?\n운동 목록과 내부 이두·삼두 설정이 함께 이동합니다.`
    : confirm?.kind === "clear-all"
      ? "본운동·워밍업·마무리 운동이 모두 즉시 삭제됩니다(저장 안 눌러도 바로 반영). ⚠️ 되돌릴 수 없습니다. (이미 완료한 운동 기록·점수는 그대로 유지됩니다.)"
      : confirm?.kind === "all"
        ? "직접 등록·수정한 모든 부위의 운동이 추천 운동으로 교체되고 바로 저장됩니다. 되돌릴 수 없습니다."
        : "이 부위에서 편집 중인 운동들이 추천 운동으로 교체됩니다. (저장 전이면 ‘저장’을 눌러야 반영됩니다.)";
const dialogConfirmLabel =
  confirm?.kind === "arm-swap"
    ? "교환하기"
    : confirm?.kind === "clear-all"
      ? "전체 비우기"
      : "교체하기";

<ConfirmDialog
  open={confirm !== null}
  tone={confirm?.kind === "arm-swap" ? "default" : "danger"}
  title={dialogTitle}
  message={dialogMessage}
  confirmLabel={dialogConfirmLabel}
  onConfirm={() => {
    if (confirm?.kind === "arm-swap") {
      doSwapArmRoutine(confirm.sourceDayIndex, confirm.targetDayIndex);
    } else if (confirm?.kind === "all") {
      doRecommendAll();
    } else if (confirm?.kind === "focus") {
      doRecommendFocus(confirm.section);
    } else if (confirm?.kind === "day") {
      confirm.day.focuses.forEach((focus) => doRecommendFocus(focus));
    } else if (confirm?.kind === "clear-all") {
      doClearAll();
    }
    setConfirm(null);
  }}
  onCancel={() => setConfirm(null)}
/>
```

Do not mutate `plans`, `focuses`, or `customWeek` before the server returns.

- [ ] **Step 5: Run the targeted unit, lint, and happy-path E2E checks**

Run:

```bash
pnpm exec vitest run tests/be/logic/arm-routine-swap.test.ts tests/be/logic/day-slots.test.ts tests/be/logic/plan-order.test.ts
pnpm exec eslint src/features/routine/arm-routine-swap.ts src/features/routine/plan-actions.ts src/features/routine/components/plan-editor.tsx src/app/plan/page.tsx
pnpm exec playwright test tests/e2e/plan-editor-multi-focus-add.spec.ts tests/e2e/arm-routine-swap.spec.ts
```

Expected: label assertions and happy-path UI swap PASS. The existing multi-focus add test still proves that the visually unified `팔` choice writes into the arm slot whose `blockIds` remain `biceps`.

- [ ] **Step 6: Commit the user-visible flow**

```bash
git add src/features/routine/plan-actions.ts src/app/plan/page.tsx src/features/routine/components/plan-editor.tsx tests/e2e/plan-editor-multi-focus-add.spec.ts tests/e2e/arm-routine-swap.spec.ts
git commit -m "feat: 운동 등록에서 팔 루틴 교환 지원"
```

---

### Task 4: 데이터 보존·동시성·미저장 회귀 검증

**Files:**

- Modify: `tests/e2e/arm-routine-swap.spec.ts`

**Interfaces:**

- Consumes: the UI hooks, server action, and RPC from Tasks 2-3.
- Produces: regression evidence that only the two arm slots and their internal arm blocks change.

- [ ] **Step 1: Complete the happy-path test with before/after DB snapshots**

Before clicking swap, query and retain all exercise fields except the trigger-managed `updated_at`:

```ts
type ExerciseSnapshot = {
  id: string;
  day_index: number;
  focus: string;
  position: number;
  exercise_id: string;
  equipment: string;
  sets: number;
  reps: number;
  weight_kg: string | null;
  set_details: unknown;
  memo: string | null;
  created_at: string;
};

async function loadExerciseSnapshot(
  email: string,
): Promise<ExerciseSnapshot[]> {
  const uid = `(select id from auth.users where lower(email)=lower($1))`;
  return dbQuery<ExerciseSnapshot>(
  `select id, day_index, focus, position, exercise_id, equipment, sets, reps,
          weight_kg::text, set_details, memo, created_at::text
     from public.routine_exercises
    where user_id=${uid}
    order by focus, exercise_id`,
    [email],
  );
}

async function loadCustomWeek(email: string): Promise<unknown> {
  const rows = await dbQuery<{ custom_week: unknown }>(
    `select custom_week
       from public.user_routines
      where user_id=(select id from auth.users where lower(email)=lower($1))`,
    [email],
  );
  return rows[0]?.custom_week;
}

async function loadCompletionSnapshot(
  email: string,
): Promise<Record<string, unknown>[]> {
  return dbQuery<Record<string, unknown>>(
    `select id::text, for_date::text, exercise_row_id::text, status,
            exercise_id, equipment, sets, reps, weight_kg::text, focus,
            set_details, created_at::text
       from public.exercise_completions
      where user_id=(select id from auth.users where lower(email)=lower($1))
      order by id`,
    [email],
  );
}

async function loadConditioningSnapshot(
  email: string,
): Promise<Record<string, unknown>[]> {
  return dbQuery<Record<string, unknown>>(
    `select id::text, focus, kind, position, item_id, duration_min,
            speed::text, incline::text, memo, sets, reps, created_at::text
       from public.routine_conditioning
      where user_id=(select id from auth.users where lower(email)=lower($1))
      order by id`,
    [email],
  );
}

async function loadDailyPlanSnapshot(
  email: string,
): Promise<Record<string, unknown>[]> {
  return dbQuery<Record<string, unknown>>(
    `select id::text, for_date::text, focus, position, exercise_id,
            equipment, sets, reps, weight_kg::text, set_details, memo,
            created_at::text
       from public.daily_plan
      where user_id=(select id from auth.users where lower(email)=lower($1))
      order by id`,
    [email],
  );
}

async function loadRoutineAuxSnapshot(
  email: string,
): Promise<Record<string, unknown> | undefined> {
  const rows = await dbQuery<Record<string, unknown>>(
    `select start_date::text, rest_date::text, override_date::text,
            override_block, baseline_routine, day_index_migrated,
            last_deferred_date::text, deferred_target,
            today_added_date::text, today_added_blocks
       from public.user_routines
      where user_id=(select id from auth.users where lower(email)=lower($1))`,
    [email],
  );
  return rows[0];
}

async function loadArmDayIndexes(
  email: string,
): Promise<{ exercise_id: string; day_index: number }[]> {
  return dbQuery<{ exercise_id: string; day_index: number }>(
    `select exercise_id, day_index
       from public.routine_exercises
      where user_id=(select id from auth.users where lower(email)=lower($1))
        and focus='arm'
      order by exercise_id`,
    [email],
  );
}
```

After the four exercise rows are inserted, seed the three records that must not move and load all before-snapshots:

```ts
await dbQuery(
  `insert into public.exercise_completions
     (user_id, for_date, exercise_row_id, status, exercise_id, equipment,
      sets, reps, weight_kg, focus, set_details)
   select user_id, (now() at time zone 'Asia/Seoul')::date, id, 'done',
          exercise_id, equipment, sets, reps, weight_kg, focus, set_details
     from public.routine_exercises
    where user_id=${uid} and exercise_id='biceps-curl'`,
  [email],
);
await dbQuery(
  `insert into public.routine_conditioning
     (user_id, focus, kind, position, item_id, duration_min, speed, incline, memo)
   values (${uid}, 'arm', 'warmup', 0, 'running', 7, 8, 1, '워밍업 유지')`,
  [email],
);
await dbQuery(
  `insert into public.daily_plan
     (user_id, for_date, focus, position, exercise_id, equipment,
      sets, reps, weight_kg, set_details, memo)
   values (${uid}, (now() at time zone 'Asia/Seoul')::date, 'arm', 0,
           'hammer-curl', 'dumbbell', 3, 11, 10,
           '[{"weightKg":10,"reps":11}]'::jsonb, '오늘만 유지')`,
  [email],
);

const before = await loadExerciseSnapshot(email);
const completionsBefore = await loadCompletionSnapshot(email);
const conditioningBefore = await loadConditioningSnapshot(email);
const dailyPlanBefore = await loadDailyPlanSnapshot(email);
const routineAuxBefore = await loadRoutineAuxSnapshot(email);
```

After the UI reports success and reloads, assert:

```ts
const after = await loadExerciseSnapshot(email);
for (const row of before) {
  const moved = after.find((candidate) => candidate.id === row.id);
  expect(moved).toBeDefined();
  expect({ ...moved, day_index: row.day_index }).toEqual(row);
  expect(moved?.day_index).toBe(
    row.focus === "arm" ? (row.day_index === 0 ? 1 : 0) : row.day_index,
  );
}

expect(await loadCustomWeek(email)).toEqual([
  ["back", "triceps"],
  ["shoulder", "biceps"],
  ["rest"],
  ["rest"],
  ["rest"],
  ["rest"],
  ["rest"],
]);
expect(await loadCompletionSnapshot(email)).toEqual(completionsBefore);
expect(await loadConditioningSnapshot(email)).toEqual(conditioningBefore);
expect(await loadDailyPlanSnapshot(email)).toEqual(dailyPlanBefore);
expect(await loadRoutineAuxSnapshot(email)).toEqual(routineAuxBefore);
```

After the DB snapshots pass, open each day’s `운동 추가` picker and verify that the moved internal subtype still controls the appended row:

```ts
const reloadedDay0 = page.locator('[data-plan-day-index="0"]');
await reloadedDay0.getByRole("button", { name: "운동 추가" }).click();
await reloadedDay0.getByRole("button", { name: "팔 운동 추가" }).click();
await expect(
  reloadedDay0.getByText("트라이셉스 푸시다운", { exact: true }),
).toHaveCount(2);
await expect(
  reloadedDay0.getByText("바이셉스 컬", { exact: true }),
).toHaveCount(0);

const reloadedDay1 = page.locator('[data-plan-day-index="1"]');
await reloadedDay1.getByRole("button", { name: "운동 추가" }).click();
await reloadedDay1.getByRole("button", { name: "팔 운동 추가" }).click();
await expect(
  reloadedDay1.getByText("바이셉스 컬", { exact: true }),
).toHaveCount(2);
await expect(
  reloadedDay1.getByText("트라이셉스 푸시다운", { exact: true }),
).toHaveCount(0);
```

These rows remain client-only because the test does not press an `N일차 저장` button.

- [ ] **Step 2: Add the unsaved-change test before changing implementation**

With a fresh seeded account:

```ts
await page.goto("/plan", { waitUntil: "networkidle" });
const day0 = page.locator('[data-plan-day-index="0"]');
await day0.getByRole("button", { name: "운동 추가" }).click();
await day0.getByRole("button", { name: "팔 운동 추가" }).click();
await day0.getByTestId("arm-swap-button-0").click();
await day0.getByRole("button", { name: "2일차 · 어깨 + 팔" }).click();
await expect(
  page.getByText(
    "저장하지 않은 운동 변경이 있습니다. 먼저 각 일차를 저장해주세요.",
  ),
).toBeVisible();
await expect(page.getByRole("dialog")).toHaveCount(0);
expect(await loadExerciseSnapshot(email)).toEqual(before);
expect(await loadCustomWeek(email)).toEqual(initialWeek);
```

Expected: the client blocks before calling the RPC for dirty source-arm, target-arm, and unrelated non-arm slots. Add a table-driven version of the same interaction for `0:arm`, `1:arm`, and `0:back` so every local edit survives until the user explicitly saves it.

- [ ] **Step 3: Add the stale-screen rollback test**

Load `/plan`, change only day 6 from `['rest']` to `['core']` through the DB helper, and then attempt the swap from the stale page:

```ts
await page.goto("/plan", { waitUntil: "networkidle" });
await dbQuery(
  `update public.user_routines
      set custom_week=jsonb_set(custom_week, '{6}', '["core"]'::jsonb)
    where user_id=(select id from auth.users where lower(email)=lower($1))`,
  [email],
);

const day0 = page.locator('[data-plan-day-index="0"]');
await day0.getByTestId("arm-swap-button-0").click();
await day0.getByRole("button", { name: "2일차 · 어깨 + 팔" }).click();
await page.getByRole("button", { name: "교환하기" }).click();
await expect(page.getByText(
  "루틴이 다른 곳에서 변경되었습니다. 새로고침 후 다시 시도해주세요.",
)).toBeVisible();
expect(await loadArmDayIndexes(email)).toEqual([
  { exercise_id: "biceps-curl", day_index: 0 },
  { exercise_id: "triceps-pushdown", day_index: 1 },
]);
expect(await loadCustomWeek(email)).toEqual([
  ["back", "biceps"],
  ["shoulder", "triceps"],
  ["rest"],
  ["rest"],
  ["rest"],
  ["rest"],
  ["core"],
]);
```

Add one legacy-format case using top-level string days. Seed `custom_week` as `["biceps","triceps","rest","rest","rest","rest","rest"]`, keep one arm row on day 0 and one on day 1, and perform the same UI swap. Assert that the two original row IDs exchange only `day_index` and the selected user’s week becomes the normalized, safely swapped value:

```ts
expect(await loadCustomWeek(email)).toEqual([
  ["triceps"],
  ["biceps"],
  ["rest"],
  ["rest"],
  ["rest"],
  ["rest"],
  ["rest"],
]);
expect(await loadArmDayIndexes(email)).toEqual([
  { exercise_id: "biceps-curl", day_index: 1 },
  { exercise_id: "triceps-pushdown", day_index: 0 },
]);
```

No other account or routine row is normalized; this conversion happens only to the locked row being intentionally swapped.

- [ ] **Step 4: Run the focused E2E suite**

Run:

```bash
pnpm exec playwright test tests/e2e/arm-routine-swap.spec.ts tests/e2e/plan-editor-multi-focus-add.spec.ts tests/e2e/side-volume.spec.ts
```

Expected: happy path, data identity, unchanged tables, dirty guard, stale rollback, arm subtype recommendations, and existing side-volume behavior all PASS.

- [ ] **Step 5: Run the full verification gate**

Run in this order so the cheapest failures surface first:

```bash
git diff --check
pnpm test
pnpm lint
pnpm build
```

Expected: all commands exit 0. If `pnpm test:schema` is skipped because `.env.test.local` is absent, report that explicitly and retain the static schema-contract plus E2E evidence; do not claim live RPC deployment without a non-skipped check.

- [ ] **Step 6: Commit the completed regression coverage**

```bash
git add tests/e2e/arm-routine-swap.spec.ts
git commit -m "test: 팔 루틴 교환 데이터 보존 검증"
```

---

## Final Review Checklist

- [ ] `arm` 슬롯의 `/plan` 헤더와 추가 대상은 모두 `팔`이며 `이두`/`삼두`가 노출되지 않는다.
- [ ] `blockIds`는 이두·삼두·전완 값을 유지하고 추천/직접 추가 필터가 이동한 값에 맞는다.
- [ ] 교환된 `routine_exercises` 행은 UUID, 운동, 기구, 순서, 세트, 횟수, 무게, 세트 상세, 메모, 생성 시각을 유지한다.
- [ ] 비팔 운동, `routine_conditioning`, `daily_plan`, `exercise_completions`, `override_*`, `today_added_*`는 바뀌지 않는다.
- [ ] 커스텀 루틴이 아니거나 팔 슬롯이 두 개 미만이면 교환 버튼이 없다.
- [ ] 화면의 미저장 변경, 오래된 화면, 최대 3블록 초과, 잘못된 일차에서 DB 부분 변경이 없다.
- [ ] `supabase/schema.sql` 반영 상태와 `main`/원격 푸시 상태를 최종 보고에서 각각 명시한다.
