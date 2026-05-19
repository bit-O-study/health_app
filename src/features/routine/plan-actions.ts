"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/features/profile/data-access";
import { getUserRoutine } from "@/features/routine/data-access";
import { resolveRoutine, type FocusTone } from "@/features/routine/data";
import {
  exercisesForFocus,
  getCatalogExercise,
  isEquipmentId,
  prescribe,
  type EquipmentId,
} from "@/features/routine/exercise-catalog";

export type SavePlanResult = { ok: true } | { ok: false; error: string };

export type ManualPlanItem = {
  exerciseId: string;
  equipment: EquipmentId;
  sets: number;
  reps: number;
  weightKg: number | null;
};

/** variant.week 에서 rest 를 뺀 고유 부위들 */
function uniqueFocuses(week: { tone: FocusTone }[]): Exclude<
  FocusTone,
  "rest"
>[] {
  const seen = new Set<FocusTone>();
  const out: Exclude<FocusTone, "rest">[] = [];
  for (const day of week) {
    if (day.tone !== "rest" && !seen.has(day.tone)) {
      seen.add(day.tone);
      out.push(day.tone);
    }
  }
  return out;
}

/**
 * 추천 운동들로 등록: 현재 루틴의 모든 부위에 대해
 * (성별·경력·체형) 기반 운동/세트/횟수/무게를 채워 넣는다(기존 등록은 대체).
 */
export async function registerRecommendedPlanAction(): Promise<SavePlanResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const [profile, routine] = await Promise.all([
    getUserProfile(),
    getUserRoutine(),
  ]);
  if (!profile) return { ok: false, error: "프로필이 필요합니다." };
  if (!routine) return { ok: false, error: "먼저 루틴을 설정하세요." };

  const { variant } = resolveRoutine(
    routine.splits,
    routine.variantId,
    routine.customWeek,
  );

  const gender = profile.gender;
  const opts = {
    gender,
    experience: profile.experience,
    bodyType: profile.bodyType ?? ("average" as const),
    weightKg: profile.weightKg ?? 65,
  };

  const rows = uniqueFocuses(variant.week).flatMap((focus) =>
    exercisesForFocus(focus, gender).map((ex, index) => {
      const p = prescribe(ex.id, opts);
      return {
        user_id: user.id,
        focus,
        position: index,
        exercise_id: ex.id,
        equipment: ex.equipments[0].equipment,
        sets: p.sets,
        reps: p.reps,
        weight_kg: p.weightKg,
      };
    }),
  );

  const del = await supabase
    .from("routine_exercises")
    .delete()
    .eq("user_id", user.id);
  if (del.error) return { ok: false, error: del.error.message };

  if (rows.length > 0) {
    const ins = await supabase.from("routine_exercises").insert(rows);
    if (ins.error) return { ok: false, error: ins.error.message };
  }

  revalidatePath("/");
  return { ok: true };
}

/**
 * 직접 등록: 특정 부위의 운동 목록을 통째로 교체한다.
 */
export async function saveManualPlanAction(
  focus: string,
  items: ManualPlanItem[],
): Promise<SavePlanResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

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

  const del = await supabase
    .from("routine_exercises")
    .delete()
    .eq("user_id", user.id)
    .eq("focus", focus);
  if (del.error) return { ok: false, error: del.error.message };

  if (items.length > 0) {
    const rows = items.map((it, index) => ({
      user_id: user.id,
      focus,
      position: index,
      exercise_id: it.exerciseId,
      equipment: it.equipment,
      sets: it.sets,
      reps: it.reps,
      weight_kg: it.weightKg,
    }));
    const ins = await supabase.from("routine_exercises").insert(rows);
    if (ins.error) return { ok: false, error: ins.error.message };
  }

  revalidatePath("/");
  return { ok: true };
}