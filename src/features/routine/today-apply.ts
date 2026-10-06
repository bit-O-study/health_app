import "server-only";

import { getCatalogExercise } from "@/features/routine/exercise-catalog";
import { isEquipmentId, type EquipmentId } from "@/features/routine/exercise-catalog-labels";
import {
  addExercisesTodayOnlyAction,
  clearDailyPlanForDateAction,
} from "@/features/routine/daily-plan-actions";
import { deferRoutineOneDayAction } from "@/features/routine/actions";
import { seoulYmd } from "@/features/routine/data";
import { todayExerciseIds } from "@/features/routine/today-exercise-ids";

export type ApplyMode = "add" | "replace";

export type ApplyTodayResult =
  | { ok: true; added: number; skipped: number }
  | { ok: false; error: string };

/**
 * 추천 운동을 **오늘만** 담는다 — AI 트레이너 탭과 맞춤 운동 앱(라이트)이 같이 쓴다(2026-10-01).
 *
 * - `add`: 오늘 운동에 더한다(오늘 이미 할 운동은 빼고).
 * - `replace`: 오늘 운동을 이걸로 바꾼다 — '운동 직접 담기'와 같은 방식: 오늘 원래 운동은
 *   **내일로 미루고**(사라지지 않는다) 오늘 계획을 비운 뒤 담는다. 원래 쉬는 날이면 그냥 담는다.
 *
 * 🔴 앱이 보낸 목록은 믿지 않고 카탈로그·기구를 다시 검사한다. 세트·무게는 내 기록 기준 처방.
 *    영구 루틴은 건드리지 않는다(원칙 2, 사용자 결정: 라이트는 오늘만 운동 변경으로만).
 */
export async function applyItemsTodayOnly(
  items: unknown,
  mode: ApplyMode = "add",
  max = 10,
): Promise<ApplyTodayResult> {
  const clean: { exerciseId: string; equipment: EquipmentId }[] = [];
  const seen = new Set<string>();
  for (const it of (Array.isArray(items) ? items : []).slice(0, max) as { exerciseId?: unknown; equipment?: unknown }[]) {
    const ex = typeof it?.exerciseId === "string" ? getCatalogExercise(it.exerciseId) : undefined;
    if (!ex || seen.has(ex.id) || !isEquipmentId(it.equipment)) continue;
    if (!ex.equipments.some((e) => e.equipment === it.equipment)) continue;
    seen.add(ex.id);
    clean.push({ exerciseId: ex.id, equipment: it.equipment });
  }
  if (clean.length === 0) return { ok: false, error: "담을 운동을 골라 주세요." };

  if (mode === "replace") {
    // 오늘 할 운동이 있을 때만 미룬다 — 쉬는 날에 밀면 내일 운동까지 하루씩 밀린다.
    if ((await todayExerciseIds()).size > 0) {
      await deferRoutineOneDayAction("direct");
      const cleared = await clearDailyPlanForDateAction(seoulYmd());
      if (!cleared.ok) return cleared;
    }
  }

  const already = await todayExerciseIds();
  const add = clean.filter((c) => !already.has(c.exerciseId));
  if (add.length === 0) return { ok: true, added: 0, skipped: clean.length };
  const r = await addExercisesTodayOnlyAction(add);
  if (!r.ok) return r;
  return { ok: true, added: add.length, skipped: clean.length - add.length };
}
