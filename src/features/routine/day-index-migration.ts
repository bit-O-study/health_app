import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserRoutine } from "@/features/routine/data-access";
import {
  focusToDaysMap,
  routineDaySlots,
  type DayBlockId,
  type DaySlot,
} from "@/features/routine/data";
import {
  NULL_DAY_KEY,
  planFocusDaySync,
  planRoutineSlotRemap,
} from "@/features/routine/day-sync-plan";

type ExRow = {
  id: string;
  day_index: number | null;
  focus: string;
  position: number;
  exercise_id: string;
  equipment: string;
  sets: number;
  reps: number;
  weight_kg: number | null;
  set_details: unknown;
  memo: unknown;
};

/**
 * 루틴 저장 직전/직후 슬롯을 비교해 같은 의미의 운동 묶음을 새 일차로 옮긴다.
 * 행 id로 갱신하므로 이두↔삼두 날짜를 맞바꿔도 중간 update가 서로 섞이지 않는다.
 */
export async function remapRoutineExerciseSlots(
  userId: string,
  previousSlots: DaySlot[],
  nextSlots: DaySlot[],
): Promise<void> {
  const ops = planRoutineSlotRemap(previousSlots, nextSlots);
  if (ops.length === 0) return;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("routine_exercises")
    .select("id, day_index, focus")
    .eq("user_id", userId);
  if (!data || data.length === 0) return;

  const rows = data as { id: string; day_index: number | null; focus: string }[];
  await Promise.all(
    ops.map((op) => {
      const ids = rows
        .filter((row) => row.focus === op.focus && row.day_index === op.from)
        .map((row) => row.id);
      if (ids.length === 0) return Promise.resolve();
      return op.to === null
        ? supabase.from("routine_exercises").delete().in("id", ids)
        : supabase
            .from("routine_exercises")
            .update({ day_index: op.to })
            .in("id", ids);
    }),
  );
}

/**
 * routine_exercises 의 day_index 를 "현재 루틴이 그 부위를 쓰는 일차들"에 맞춰 정렬한다.
 * 일차별 독립 저장의 핵심 — 루틴이 바뀌면(드래그/설정/프리셋/다시시작) 행의 day_index 가
 * 새 루틴과 어긋나(드리프트) 어떤 일차는 행이 비고, 그러면 today 화면이 다른 일차 운동을
 * 합쳐 보여주며 편집까지 섞인다. 이 함수가 그 어긋남을 바로잡는다.
 *
 * 부위별로:
 *  - 현재 루틴이 쓰는 일차(target) 가 아닌 일차에 있는 행(NULL 포함, '드리프트/구버전')은
 *    → 비어 있는 target 일차로 **이동**(UPDATE — UUID 보존, 완료기록 유지, 그 일차 편집도 보존)
 *  - 옮길 빈 target 이 없는 나머지 드리프트 행은 → **삭제**(중복/불필요)
 *  - 그래도 비어 있는 target 일차는 → 값이 있는 target 일차에서 **복사**(새 UUID)
 *  - 루틴이 더 안 쓰는 부위는 그대로 둠(읽히지 않음; NULL 만 0 으로 정리)
 *
 * 멱등하다(이미 맞는 상태면 아무 일도 안 함).
 */
export async function syncRoutineExerciseDays(
  userId: string,
  splits: number,
  variantId: string,
  customWeek: DayBlockId[][] | null,
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const slots = routineDaySlots(splits, variantId, customWeek);
  const focusDays = focusToDaysMap(slots);
  // (부위:일차) → 역할(주=false/보조=true). 같은 부위가 여러 일차일 때 복사 시
  // 역할이 같은 일차끼리만 채우기 위함(본↔보조 교차 복사 방지).
  const roleByFocusDay = new Map<string, string>();
  for (const s of slots) {
    roleByFocusDay.set(
      `${s.focus}:${s.dayIndex}`,
      `${s.isSide ? "side" : "main"}:${s.blockIds.join("+")}`,
    );
  }

  const { data: allRows } = await supabase
    .from("routine_exercises")
    .select(
      "id, day_index, focus, position, exercise_id, equipment, sets, reps, weight_kg, set_details, memo",
    )
    .eq("user_id", userId);
  if (!allRows || allRows.length === 0) return;

  const byFocus = new Map<string, ExRow[]>();
  for (const r of allRows as ExRow[]) {
    const a = byFocus.get(r.focus);
    if (a) a.push(r);
    else byFocus.set(r.focus, [r]);
  }

  for (const [focus, rows] of byFocus) {
    const target = focusDays.get(focus as never) ?? [];

    // day_index 별 그룹 (NULL → NULL_DAY_KEY)
    const byDay = new Map<number, ExRow[]>();
    for (const r of rows) {
      const k = r.day_index ?? NULL_DAY_KEY;
      const a = byDay.get(k);
      if (a) a.push(r);
      else byDay.set(k, [r]);
    }

    // 루틴이 안 쓰는 부위 — NULL 만 0 으로 정리하고 둔다.
    if (target.length === 0) {
      if (byDay.has(NULL_DAY_KEY)) {
        await supabase
          .from("routine_exercises")
          .update({ day_index: 0 })
          .eq("user_id", userId)
          .eq("focus", focus)
          .is("day_index", null);
      }
      continue;
    }

    const updateDay = (from: number, to: number) => {
      const q = supabase
        .from("routine_exercises")
        .update({ day_index: to })
        .eq("user_id", userId)
        .eq("focus", focus);
      return from === NULL_DAY_KEY
        ? q.is("day_index", null)
        : q.eq("day_index", from);
    };
    const deleteDay = (from: number) => {
      const q = supabase
        .from("routine_exercises")
        .delete()
        .eq("user_id", userId)
        .eq("focus", focus);
      return from === NULL_DAY_KEY
        ? q.is("day_index", null)
        : q.eq("day_index", from);
    };

    // 순수 계획: 이동/삭제/복사 연산. 복사는 같은 역할(주/보조)끼리만(교차 복사 금지).
    const slotRole = (day: number) =>
      roleByFocusDay.get(`${focus}:${day}`) ?? "unknown";
    const ops = planFocusDaySync([...byDay.keys()], target, slotRole);

    // 연산 적용 — move 먼저(byDay 갱신) → delete → copy(byDay 에서 소스 읽음) 순.
    for (const op of ops) {
      if (op.type === "move") {
        await updateDay(op.from, op.to);
        byDay.set(op.to, byDay.get(op.from)!);
        byDay.delete(op.from);
      } else if (op.type === "delete") {
        await deleteDay(op.from);
        byDay.delete(op.from);
      } else {
        const src = byDay.get(op.from);
        if (src && src.length > 0) {
          const copies = src.map((r) => ({
            user_id: userId,
            day_index: op.to,
            focus: r.focus,
            position: r.position,
            exercise_id: r.exercise_id,
            equipment: r.equipment,
            sets: r.sets,
            reps: r.reps,
            weight_kg: r.weight_kg,
            set_details: r.set_details ?? null,
            memo: r.memo ?? null,
          }));
          await supabase.from("routine_exercises").insert(copies);
          byDay.set(op.to, copies as unknown as ExRow[]);
        }
      }
    }
  }
}

/**
 * 지연·멱등 동기화 (페이지 진입 시). day_index_migrated 플래그를 원자적으로 claim 해
 * 한 번만(동시 호출에도 1회만) 현재 루틴 기준으로 day_index 를 정렬한다. 끝나면 플래그
 * true 로 두어 다음 로드부터는 호출 자체를 건너뛴다. (루틴 변경 액션은 플래그를 false 로
 * 되돌려 다음 진입 때 다시 동기화되게 한다.)
 */
export async function ensureDayIndexBackfilled(userId: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();

  // 원자적 claim: false → true 로 바꾼 행이 있을 때만(=내가 잡았을 때만) 진행.
  const { data: claimed } = await supabase
    .from("user_routines")
    .update({ day_index_migrated: true })
    .eq("user_id", userId)
    .eq("day_index_migrated", false)
    .select("user_id");
  if (!claimed || claimed.length === 0) return false;

  const routine = await getUserRoutine();
  if (!routine) return false;

  await syncRoutineExerciseDays(
    userId,
    routine.splits,
    routine.variantId,
    routine.customWeek,
  );
  return true;
}
