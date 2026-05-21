"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  addDaysYmd,
  CUSTOM_SPLITS,
  CUSTOM_VARIANT_ID,
  isDayBlockId,
  isValidRoutine,
  normalizeCustomWeek,
  resolveRoutine,
  seoulYmd,
  type DayBlockId,
} from "@/features/routine/data";
import {
  exercisesForFocus,
  prescribe,
  type FocusKey,
} from "@/features/routine/exercise-catalog";
import { getUserProfile } from "@/features/profile/data-access";

export type SaveRoutineResult = { ok: true } | { ok: false; error: string };

/**
 * 현재 사용자의 루틴을 저장(없으면 생성, 있으면 갱신)합니다.
 * variantId 가 "custom" 이면 customWeek(블록 id 배열 ×7)를 함께 저장합니다.
 * 멀티 부위 일자 지원: customWeek 는 `DayBlockId[][]` (각 요일에 1개 이상 블록).
 * 구 포맷 `DayBlockId[]` 도 받아 자동 정규화.
 * start_date 는 최초 생성 시에만 기록되고 변경 시 유지됩니다.
 */
export async function saveRoutineAction(
  splits: number,
  variantId: string,
  customWeek?: DayBlockId[][] | DayBlockId[] | null,
): Promise<SaveRoutineResult> {
  const isCustom = variantId === CUSTOM_VARIANT_ID;

  let normalized: DayBlockId[][] | null = null;
  if (isCustom) {
    normalized = normalizeCustomWeek(customWeek);
    if (!normalized) {
      return { ok: false, error: "커스텀 분할 구성이 올바르지 않습니다." };
    }
  } else if (!isValidRoutine(splits, variantId)) {
    return { ok: false, error: "선택한 루틴이 올바르지 않습니다." };
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "로그인이 필요합니다." };
  }

  // 루틴을 바꾸면 오늘만 변경/휴식 오버라이드는 의미가 없어지므로 함께 클리어.
  const { error } = await supabase.from("user_routines").upsert(
    {
      user_id: user.id,
      splits: isCustom ? CUSTOM_SPLITS : splits,
      variant_id: variantId,
      custom_week: isCustom ? normalized : null,
      rest_date: null,
      override_date: null,
      override_block: null,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    return { ok: false, error: error.message };
  }

  // 새 루틴으로 바꾸면 오늘 / 미래의 "오늘만 변경" 오버라이드도 모두 무효화해야 한다.
  // (그렇지 않으면 이전 daily_plan 이 새 루틴의 오늘 부위를 가려서 변경이 안 보임)
  const today = seoulYmd();
  await Promise.all([
    supabase
      .from("daily_plan")
      .delete()
      .eq("user_id", user.id)
      .gte("for_date", today),
    supabase
      .from("daily_conditioning")
      .delete()
      .eq("user_id", user.id)
      .gte("for_date", today),
  ]);

  // 새 루틴이 쓰는 부위 중 routine_exercises 에 행이 하나도 없는 부위는
  // 추천 운동으로 자동 채워준다. 기존 부위 (이미 행이 있는) 는 사용자
  // 커스터마이즈를 유지하기 위해 건드리지 않음.
  await fillMissingFocusesAction(user.id, splits, variantId, normalized);

  revalidatePath("/");
  revalidatePath("/settings/routine");
  revalidatePath("/plan");
  revalidatePath("/plan/today");
  return { ok: true };
}

/**
 * 새 루틴의 부위 중 등록된 운동이 없는 부위에만 추천 운동을 자동 등록.
 * 기존에 운동이 있는 부위는 건드리지 않음 (사용자 커스터마이즈 보존).
 */
async function fillMissingFocusesAction(
  userId: string,
  splits: number,
  variantId: string,
  customWeek: DayBlockId[][] | null,
): Promise<void> {
  const profile = await getUserProfile();
  if (!profile) return;

  // 새 루틴이 쓰는 부위 set
  const { variant } = resolveRoutine(splits, variantId, customWeek);
  const usedFocuses = new Set<FocusKey>();
  for (const day of variant.week) {
    const tones = day.tones ?? [day.tone];
    for (const t of tones) {
      if (t !== "rest") usedFocuses.add(t as FocusKey);
    }
  }
  if (usedFocuses.size === 0) return;

  const supabase = await createSupabaseServerClient();
  // 기존 행의 focus set 조회
  const { data: existing } = await supabase
    .from("routine_exercises")
    .select("focus")
    .eq("user_id", userId);
  const existingFocuses = new Set(
    (existing ?? []).map((r: { focus: string }) => r.focus),
  );

  // 비어 있는 부위만 추천으로 채움
  const missingFocuses = [...usedFocuses].filter(
    (f) => !existingFocuses.has(f),
  );
  if (missingFocuses.length === 0) return;

  const opts = {
    gender: profile.gender,
    experience: profile.experience,
    bodyType: profile.bodyType ?? ("average" as const),
    weightKg: profile.weightKg ?? 65,
  };
  const rows = missingFocuses.flatMap((focus) =>
    exercisesForFocus(focus, profile.gender).map((ex, index) => {
      const p = prescribe(ex.id, opts);
      return {
        user_id: userId,
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
  if (rows.length > 0) {
    await supabase.from("routine_exercises").insert(rows);
  }
}

/** 루틴 기준일을 오늘로 재설정 — 오늘이 루틴 1일차가 된다. */
export async function restartRoutineFromTodayAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("user_routines")
    .update({
      start_date: seoulYmd(),
      rest_date: null,
      override_date: null,
      override_block: null,
    })
    .eq("user_id", user.id);

  revalidatePath("/");
}

/**
 * 오늘을 휴식으로 전환하고 루틴을 하루 미룬다.
 * 기준일 +1일 → 오늘 예정이던 운동이 내일로 이동, 오늘은 휴식 표시.
 */
export async function convertTodayToRestAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data } = await supabase
    .from("user_routines")
    .select("start_date")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) return;

  const today = seoulYmd();
  await supabase
    .from("user_routines")
    .update({
      start_date: addDaysYmd((data as { start_date: string }).start_date, 1),
      rest_date: today,
      override_date: null,
      override_block: null,
    })
    .eq("user_id", user.id);

  revalidatePath("/");
}

/**
 * "다시 운동하기" — convertTodayToRest 의 반대.
 * 오늘이 휴식 상태(rest_date == 오늘)인 경우에만:
 *   start_date 를 -1 일 되돌리고 rest_date 를 null 로.
 * 직전에 표시되던 운동 데이터가 다시 오늘로 돌아온다.
 */
export async function undoTodayRestAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const today = seoulYmd();
  const { data } = await supabase
    .from("user_routines")
    .select("start_date, rest_date")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) return;
  const row = data as { start_date: string; rest_date: string | null };
  if (row.rest_date !== today) return;

  await supabase
    .from("user_routines")
    .update({
      start_date: addDaysYmd(row.start_date, -1),
      rest_date: null,
    })
    .eq("user_id", user.id);

  revalidatePath("/");
}

/**
 * 오늘 하루만 다른 부위로 변경한다(루틴은 밀지 않음).
 * override_date=오늘, override_block=선택 부위. 내일부터는 원래 루틴 유지.
 */
export async function setTodayFocusAction(
  blockId: DayBlockId,
): Promise<void> {
  if (!isDayBlockId(blockId)) return;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("user_routines")
    .update({
      override_date: seoulYmd(),
      override_block: blockId,
      rest_date: null,
    })
    .eq("user_id", user.id);

  revalidatePath("/");
}