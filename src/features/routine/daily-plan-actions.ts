"use server";

import { revalidatePath } from "next/cache";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import {
  getCatalogExercise,
  isEquipmentId,
  type EquipmentId,
} from "@/features/routine/exercise-catalog";

export type DailyPlanItem = {
  exerciseId: string;
  equipment: EquipmentId;
  sets: number;
  reps: number;
  weightKg: number | null;
};

export type SaveDailyPlanResult = { ok: true } | { ok: false; error: string };

function isValidYmd(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/**
 * 그 날짜의 모든 daily_plan 오버라이드를 비운다 (= 오늘만 변경 초기화).
 *"오늘만 운동 바꾸기" 모달에서 새 부위 선택 시 호출해, 이전 누적분이 합쳐
 * 보이는 문제를 막는다. 완료 기록(exercise_completions) 은 건드리지 않음.
 */
export async function clearDailyPlanForDateAction(
  dateYmd: string,
): Promise<SaveDailyPlanResult> {
  if (!isValidYmd(dateYmd)) {
    return { ok: false, error: "날짜가 올바르지 않습니다." };
  }
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { error } = await supabase
    .from("daily_plan")
    .delete()
    .eq("user_id", user.id)
    .eq("for_date", dateYmd);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/plan/today");
  return { ok: true };
}

/**
 * 특정 날짜·부위의 본운동 오버라이드를 통째로 교체한다.
 * 비어 있는 items 로 호출하면 그 (날짜, 부위) 오버라이드만 삭제(기본으로 복귀).
 * 완료 기록(exercise_completions)은 건드리지 않아 이미 완료한 운동은 남는다.
 */
export async function saveDailyPlanAction(
  dateYmd: string,
  focus: string,
  items: DailyPlanItem[],
): Promise<SaveDailyPlanResult> {
  if (!isValidYmd(dateYmd) || !focus) {
    return { ok: false, error: "날짜·부위가 올바르지 않습니다." };
  }
  for (const it of items) {
    if (!getCatalogExercise(it.exerciseId) || !isEquipmentId(it.equipment)) {
      return { ok: false, error: "운동/기구 값이 올바르지 않습니다." };
    }
    if (
      !Number.isInteger(it.sets) ||
      it.sets < 1 ||
      it.sets > 20 ||
      !Number.isInteger(it.reps) ||
      it.reps < 1 ||
      it.reps > 100
    ) {
      return { ok: false, error: "세트/횟수 값이 올바르지 않습니다." };
    }
  }

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const del = await supabase
    .from("daily_plan")
    .delete()
    .eq("user_id", user.id)
    .eq("for_date", dateYmd)
    .eq("focus", focus);
  if (del.error) return { ok: false, error: del.error.message };

  if (items.length > 0) {
    const rows = items.map((it, index) => ({
      user_id: user.id,
      for_date: dateYmd,
      focus,
      position: index,
      exercise_id: it.exerciseId,
      equipment: it.equipment,
      sets: it.sets,
      reps: it.reps,
      weight_kg: it.weightKg,
    }));
    const ins = await supabase.from("daily_plan").insert(rows);
    if (ins.error) return { ok: false, error: ins.error.message };
  }

  revalidatePath("/");
  revalidatePath("/plan/today");
  return { ok: true };
}
