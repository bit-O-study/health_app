import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserRoutine } from "@/features/routine/data-access";
import {
  focusToDaysMap,
  routineDaySlots,
  type DayBlockId,
} from "@/features/routine/data";

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

const NULL_KEY = -1; // day_index NULL 을 내부 그룹 키로 표현

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

    // day_index 별 그룹 (NULL → NULL_KEY)
    const byDay = new Map<number, ExRow[]>();
    for (const r of rows) {
      const k = r.day_index ?? NULL_KEY;
      const a = byDay.get(k);
      if (a) a.push(r);
      else byDay.set(k, [r]);
    }

    // 루틴이 안 쓰는 부위 — NULL 만 0 으로 정리하고 둔다.
    if (target.length === 0) {
      if (byDay.has(NULL_KEY)) {
        await supabase
          .from("routine_exercises")
          .update({ day_index: 0 })
          .eq("user_id", userId)
          .eq("focus", focus)
          .is("day_index", null);
      }
      continue;
    }

    const present = [...byDay.keys()];
    const orphans = present.filter((d) => !target.includes(d)); // 드리프트/NULL
    const emptyTargets = target.filter((d) => !byDay.has(d));

    const updateDay = (from: number, to: number) => {
      const q = supabase
        .from("routine_exercises")
        .update({ day_index: to })
        .eq("user_id", userId)
        .eq("focus", focus);
      return from === NULL_KEY ? q.is("day_index", null) : q.eq("day_index", from);
    };
    const deleteDay = (from: number) => {
      const q = supabase
        .from("routine_exercises")
        .delete()
        .eq("user_id", userId)
        .eq("focus", focus);
      return from === NULL_KEY ? q.is("day_index", null) : q.eq("day_index", from);
    };

    // 1) 드리프트 행 → 빈 target 으로 이동(UUID 보존)
    let oi = 0;
    let ti = 0;
    for (; oi < orphans.length && ti < emptyTargets.length; oi++, ti++) {
      const o = orphans[oi];
      const t = emptyTargets[ti];
      await updateDay(o, t);
      byDay.set(t, byDay.get(o)!);
      byDay.delete(o);
    }
    // 2) 남은 드리프트 행 → 삭제(중복)
    for (; oi < orphans.length; oi++) {
      await deleteDay(orphans[oi]);
      byDay.delete(orphans[oi]);
    }
    // 3) 아직 비어 있는 target → 값 있는 target 에서 복사
    const stillEmpty = emptyTargets.slice(ti);
    if (stillEmpty.length > 0) {
      const canonDay = target.find((d) => byDay.has(d));
      if (canonDay !== undefined) {
        const canon = byDay.get(canonDay)!;
        for (const t of stillEmpty) {
          const copies = canon.map((r) => ({
            user_id: userId,
            day_index: t,
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
          if (copies.length > 0) {
            await supabase.from("routine_exercises").insert(copies);
          }
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
export async function ensureDayIndexBackfilled(userId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();

  // 원자적 claim: false → true 로 바꾼 행이 있을 때만(=내가 잡았을 때만) 진행.
  const { data: claimed } = await supabase
    .from("user_routines")
    .update({ day_index_migrated: true })
    .eq("user_id", userId)
    .eq("day_index_migrated", false)
    .select("user_id");
  if (!claimed || claimed.length === 0) return;

  const routine = await getUserRoutine();
  if (!routine) return;

  await syncRoutineExerciseDays(
    userId,
    routine.splits,
    routine.variantId,
    routine.customWeek,
  );
}
