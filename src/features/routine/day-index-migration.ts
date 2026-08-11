import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserRoutine } from "@/features/routine/data-access";
import {
  planDayIndexRemap,
  routineDaySlots,
  type DayBlockId,
  type DaySlot,
} from "@/features/routine/data";
import {
  planRoutineExerciseDaySync,
  type RoutineExerciseSyncRow,
} from "@/features/routine/day-sync-plan";
import { applyRoutineExerciseDaySync } from "@/features/routine/routine-exercise-writes";

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
  memo: string | null;
};

export type RoutineExerciseDaySyncResult =
  | { ok: true; routineUpdatedAt: string }
  | { ok: false; error: string };

/**
 * 현재 exercise 스냅샷에서 의미 슬롯 리맵·드리프트 수리·복사 계획을 모두 만든 뒤,
 * revision을 확인하는 단일 RPC로 적용한다. 읽은 뒤 교환/다른 writer가 먼저 끝나면
 * RPC가 STALE_ROUTINE으로 전체 변경을 거부하므로 부분 동기화가 생기지 않는다.
 */
export async function syncRoutineExerciseDays(
  userId: string,
  expectedRoutineUpdatedAt: string,
  splits: number,
  variantId: string,
  customWeek: DayBlockId[][] | null,
  {
    previousSlots = [],
    dayOrder,
    markDayIndexMigrated = false,
  }: {
    previousSlots?: DaySlot[];
    dayOrder?: number[];
    markDayIndexMigrated?: boolean;
  } = {},
): Promise<RoutineExerciseDaySyncResult> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("routine_exercises")
    .select(
      "id, day_index, focus, position, exercise_id, equipment, sets, reps, weight_kg, set_details, memo",
    )
    .eq("user_id", userId);
  if (error) return { ok: false, error: "운동 저장에 실패했습니다." };

  const rawRows = (data ?? []) as ExRow[];
  const rows: RoutineExerciseSyncRow[] = rawRows.map((row) => ({
    id: row.id,
    dayIndex: row.day_index,
    focus: row.focus,
    position: row.position,
    exerciseId: row.exercise_id,
    equipment: row.equipment,
    sets: row.sets,
    reps: row.reps,
    weightKg: row.weight_kg,
    setDetails: row.set_details,
    memo: row.memo,
  }));
  const nextSlots = routineDaySlots(splits, variantId, customWeek);
  const initialUpdates = dayOrder
    ? planDayIndexRemap(rawRows, dayOrder)
    : [];
  const mutation = planRoutineExerciseDaySync({
    rows,
    previousSlots,
    nextSlots,
    initialUpdates,
  });

  return applyRoutineExerciseDaySync(
    supabase,
    expectedRoutineUpdatedAt,
    mutation,
    markDayIndexMigrated,
  );
}

/**
 * 페이지 진입 시 legacy day_index를 한 번 정리한다. 완료 플래그도 운동 변경과 같은
 * RPC에서 마지막에 기록하므로, 플래그만 true이고 운동은 반쯤 옮겨진 상태가 없다.
 */
export async function ensureDayIndexBackfilled(userId: string): Promise<boolean> {
  const routine = await getUserRoutine();
  if (!routine || routine.dayIndexMigrated) return false;

  const result = await syncRoutineExerciseDays(
    userId,
    routine.updatedAt,
    routine.splits,
    routine.variantId,
    routine.customWeek,
    { markDayIndexMigrated: true },
  );
  if (result.ok) return true;

  // 다른 요청이나 교환이 revision을 먼저 바꿨다면 이 렌더의 routine도 오래됐다.
  // /plan은 true를 받으면 새 스냅샷으로 한 번 리다이렉트한다.
  return result.error.includes("다른 곳에서 변경");
}
