import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserRoutine } from "@/features/routine/data-access";
import { focusToDaysMap, routineDaySlots } from "@/features/routine/data";

/**
 * 일차별 독립 저장 마이그레이션 (앱 레벨, 지연·멱등).
 *
 * 과거 routine_exercises 는 (user_id, focus) 단위로 저장돼 같은 부위를 여러 일차에
 * 쓰면 공유됐다. day_index 컬럼 추가 후, 기존 행(day_index IS NULL)을 사용자의 현재
 * 루틴에 맞춰 일차별로 배치한다:
 *  - 부위가 한 일차만 쓰면 그 일차로 stamp (원본 UUID 보존 → 완료기록 유지).
 *  - 부위가 여러 일차를 쓰면(PPL×2 등) 원본은 첫 일차에 두고 나머지 일차로 행을 복제.
 *  - 현재 루틴이 안 쓰는 부위는 0 으로 stamp (어차피 읽히지 않음).
 *
 * count(head) 가드로 이미 끝났으면 즉시 반환하므로 매 페이지 진입마다 호출해도 싸다.
 */
export async function ensureDayIndexBackfilled(userId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();

  const { count } = await supabase
    .from("routine_exercises")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("day_index", null);
  if (!count) return;

  const routine = await getUserRoutine();
  // 루틴이 없으면 매핑 불가 — 미마이그레이션 행을 0 으로 stamp 해 NULL 만 제거.
  if (!routine) {
    await supabase
      .from("routine_exercises")
      .update({ day_index: 0 })
      .eq("user_id", userId)
      .is("day_index", null);
    return;
  }

  const slots = routineDaySlots(
    routine.splits,
    routine.variantId,
    routine.customWeek,
  );
  const focusDays = focusToDaysMap(slots);

  // 미마이그레이션 행 전체 로드
  const { data: legacy } = await supabase
    .from("routine_exercises")
    .select(
      "id, focus, position, exercise_id, equipment, sets, reps, weight_kg, set_details, memo",
    )
    .eq("user_id", userId)
    .is("day_index", null);
  if (!legacy || legacy.length === 0) return;

  // focus 별로 묶기
  const byFocus = new Map<string, typeof legacy>();
  for (const row of legacy) {
    const arr = byFocus.get(row.focus);
    if (arr) arr.push(row);
    else byFocus.set(row.focus, [row]);
  }

  for (const [focus, rows] of byFocus) {
    const days = focusDays.get(focus as never) ?? [];

    if (days.length === 0) {
      // 현재 루틴이 안 쓰는 부위 — NULL 만 제거 (읽히지 않음)
      await supabase
        .from("routine_exercises")
        .update({ day_index: 0 })
        .eq("user_id", userId)
        .eq("focus", focus)
        .is("day_index", null);
      continue;
    }

    // 원본은 첫 일차로 (UUID 보존)
    await supabase
      .from("routine_exercises")
      .update({ day_index: days[0] })
      .eq("user_id", userId)
      .eq("focus", focus)
      .is("day_index", null);

    // 나머지 일차로 복제 (새 UUID)
    for (const d of days.slice(1)) {
      const copies = rows.map((r) => ({
        user_id: userId,
        day_index: d,
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
