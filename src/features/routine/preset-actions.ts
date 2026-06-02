"use server";

import { revalidatePath } from "next/cache";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import {
  CUSTOM_VARIANT_ID,
  isValidRoutine,
  normalizeCustomWeek,
  seoulYmd,
} from "@/features/routine/data";

export type PresetResult = { ok: true } | { ok: false; error: string };

/** routine_exercises 의 DB 행 형태(스냅샷용) — 그대로 다시 insert 할 수 있게 snake_case 유지. */
type ExerciseSnapshot = {
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

/** 현재 루틴(설정 + 등록 운동 전체)을 이름 붙여 프리셋으로 저장. */
export async function saveRoutinePresetAction(
  name: string,
): Promise<PresetResult> {
  const trimmed = name.trim();
  if (trimmed === "") return { ok: false, error: "이름을 입력하세요." };
  if (trimmed.length > 60) return { ok: false, error: "이름이 너무 깁니다." };

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const [{ data: routine }, { data: rows }] = await Promise.all([
    supabase
      .from("user_routines")
      .select("splits, variant_id, custom_week")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("routine_exercises")
      .select(
        "focus, position, exercise_id, equipment, sets, reps, weight_kg, set_details, memo",
      )
      .eq("user_id", user.id)
      .order("focus", { ascending: true })
      .order("position", { ascending: true }),
  ]);

  if (!routine) {
    return { ok: false, error: "저장할 루틴이 없습니다." };
  }
  const r = routine as {
    splits: number;
    variant_id: string;
    custom_week: unknown;
  };

  const { error } = await supabase.from("routine_presets").insert({
    user_id: user.id,
    name: trimmed,
    splits: r.splits,
    variant_id: r.variant_id,
    custom_week: r.custom_week ?? null,
    exercises: (rows ?? []) as ExerciseSnapshot[],
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings/routine");
  return { ok: true };
}

/** 프리셋을 현재 루틴으로 복원 — 설정 교체 + 등록 운동 전체 교체. */
export async function loadRoutinePresetAction(
  presetId: string,
): Promise<PresetResult> {
  if (!presetId) return { ok: false, error: "프리셋을 찾을 수 없습니다." };
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { data, error } = await supabase
    .from("routine_presets")
    .select("splits, variant_id, custom_week, exercises")
    .eq("user_id", user.id)
    .eq("id", presetId)
    .maybeSingle();
  if (error || !data) return { ok: false, error: "프리셋을 찾을 수 없습니다." };

  const p = data as {
    splits: number;
    variant_id: string;
    custom_week: unknown;
    exercises: unknown;
  };

  const isCustom = p.variant_id === CUSTOM_VARIANT_ID;
  const normalized = isCustom ? normalizeCustomWeek(p.custom_week) : null;
  if (isCustom ? !normalized : !isValidRoutine(p.splits, p.variant_id)) {
    return { ok: false, error: "프리셋 루틴 구성이 올바르지 않습니다." };
  }

  // 1) 루틴 설정 교체 (오버라이드 클리어, 기준일 오늘로)
  const today = seoulYmd();
  const up = await supabase.from("user_routines").upsert(
    {
      user_id: user.id,
      splits: p.splits,
      variant_id: p.variant_id,
      custom_week: isCustom ? normalized : null,
      start_date: today,
      rest_date: null,
      override_date: null,
      override_block: null,
    },
    { onConflict: "user_id" },
  );
  if (up.error) return { ok: false, error: up.error.message };

  // 2) 등록 운동 전체 교체
  const del = await supabase
    .from("routine_exercises")
    .delete()
    .eq("user_id", user.id);
  if (del.error) return { ok: false, error: del.error.message };

  const snapshot = Array.isArray(p.exercises)
    ? (p.exercises as ExerciseSnapshot[])
    : [];
  if (snapshot.length > 0) {
    const rows = snapshot.map((e) => ({
      user_id: user.id,
      focus: e.focus,
      position: e.position,
      exercise_id: e.exercise_id,
      equipment: e.equipment,
      sets: e.sets,
      reps: e.reps,
      weight_kg: e.weight_kg ?? null,
      set_details: e.set_details ?? null,
      memo: e.memo ?? null,
    }));
    const ins = await supabase.from("routine_exercises").insert(rows);
    if (ins.error) return { ok: false, error: ins.error.message };
  }

  // 3) 미래 오버라이드 정리 (새 루틴과 안 맞을 수 있음)
  await Promise.all([
    supabase.from("daily_plan").delete().eq("user_id", user.id).gte("for_date", today),
    supabase
      .from("daily_conditioning")
      .delete()
      .eq("user_id", user.id)
      .gte("for_date", today),
  ]);

  revalidatePath("/");
  revalidatePath("/settings/routine");
  revalidatePath("/plan");
  revalidatePath("/plan/today");
  return { ok: true };
}

/** 프리셋 삭제. */
export async function deleteRoutinePresetAction(
  presetId: string,
): Promise<PresetResult> {
  if (!presetId) return { ok: false, error: "프리셋을 찾을 수 없습니다." };
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { error } = await supabase
    .from("routine_presets")
    .delete()
    .eq("user_id", user.id)
    .eq("id", presetId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings/routine");
  return { ok: true };
}
