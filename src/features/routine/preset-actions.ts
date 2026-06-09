"use server";

import { revalidatePath } from "next/cache";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import {
  CUSTOM_VARIANT_ID,
  focusToDaysMap,
  isValidRoutine,
  normalizeCustomWeek,
  routineDaySlots,
  seoulYmd,
} from "@/features/routine/data";

export type PresetResult = { ok: true } | { ok: false; error: string };

/** routine_exercises 의 DB 행 형태(스냅샷용) — 그대로 다시 insert 할 수 있게 snake_case 유지. */
type ExerciseSnapshot = {
  /** 주기 일차(0~6). 구버전 스냅샷엔 없을 수 있어 옵셔널. */
  day_index?: number | null;
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

/** routine_conditioning 의 DB 행 형태(스냅샷용). */
type ConditioningSnapshot = {
  focus: string;
  kind: string;
  position: number;
  item_id: string;
  duration_min: number | null;
  speed: number | null;
  incline: number | null;
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

  const [{ data: routine }, { data: rows }, { data: condRows }] =
    await Promise.all([
      supabase
        .from("user_routines")
        .select("splits, variant_id, custom_week")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("routine_exercises")
        .select(
          "day_index, focus, position, exercise_id, equipment, sets, reps, weight_kg, set_details, memo",
        )
        .eq("user_id", user.id)
        .order("day_index", { ascending: true })
        .order("focus", { ascending: true })
        .order("position", { ascending: true }),
      supabase
        .from("routine_conditioning")
        .select(
          "focus, kind, position, item_id, duration_min, speed, incline, memo",
        )
        .eq("user_id", user.id),
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
    conditioning: (condRows ?? []) as ConditioningSnapshot[],
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
    .select("splits, variant_id, custom_week, exercises, conditioning")
    .eq("user_id", user.id)
    .eq("id", presetId)
    .maybeSingle();
  if (error || !data) return { ok: false, error: "프리셋을 찾을 수 없습니다." };

  const p = data as {
    splits: number;
    variant_id: string;
    custom_week: unknown;
    exercises: unknown;
    conditioning: unknown;
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
      // 프리셋 로드 = 의도적 루틴 선택 → 기준 루틴으로도 기록
      baseline_routine: {
        splits: p.splits,
        variant_id: p.variant_id,
        custom_week: isCustom ? normalized : null,
      },
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
    // 구버전 스냅샷(day_index 없음)은 로드 루틴의 부위→일차 매핑으로 정규화 —
    // 같은 부위를 여러 일차에 쓰면 그 일차들로 복제한다.
    const needsBackfill = snapshot.some((e) => e.day_index == null);
    const focusDays = needsBackfill
      ? focusToDaysMap(
          routineDaySlots(
            p.splits,
            p.variant_id,
            isCustom ? normalized : null,
          ),
        )
      : null;

    const rows = snapshot.flatMap((e) => {
      const days =
        e.day_index != null
          ? [e.day_index]
          : (focusDays?.get(e.focus as never) ?? [0]);
      return days.map((dayIndex) => ({
        user_id: user.id,
        day_index: dayIndex,
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
    });
    const ins = await supabase.from("routine_exercises").insert(rows);
    if (ins.error) return { ok: false, error: ins.error.message };
  }

  // 2-b) 워밍업/마무리(컨디셔닝)도 전체 교체
  const delCond = await supabase
    .from("routine_conditioning")
    .delete()
    .eq("user_id", user.id);
  if (delCond.error) return { ok: false, error: delCond.error.message };

  const condSnap = Array.isArray(p.conditioning)
    ? (p.conditioning as ConditioningSnapshot[])
    : [];
  if (condSnap.length > 0) {
    const condInsert = condSnap.map((c) => ({
      user_id: user.id,
      focus: c.focus,
      kind: c.kind,
      position: c.position,
      item_id: c.item_id,
      duration_min: c.duration_min ?? null,
      speed: c.speed ?? null,
      incline: c.incline ?? null,
      memo: c.memo ?? null,
    }));
    const insCond = await supabase
      .from("routine_conditioning")
      .insert(condInsert);
    if (insCond.error) return { ok: false, error: insCond.error.message };
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

  revalidatePath("/routine");
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
