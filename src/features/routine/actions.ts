"use server";

import { revalidatePath } from "next/cache";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import {
  addDaysYmd,
  CUSTOM_SPLITS,
  CUSTOM_VARIANT_ID,
  isDayBlockId,
  isValidRoutine,
  normalizeCustomWeek,
  planDayIndexRemap,
  routineDaySlots,
  seoulYmd,
  type DayBlockId,
} from "@/features/routine/data";
import { prescribe } from "@/features/routine/exercise-catalog";
import {
  focusExercisesForSlot,
  sideExercisesForSlot,
} from "@/features/routine/recommend";
import { getUserProfile } from "@/features/profile/data-access";
import { registerRecommendedConditioningAction } from "@/features/routine/conditioning-actions";
import { syncRoutineExerciseDays } from "@/features/routine/day-index-migration";

export type SaveRoutineResult = { ok: true } | { ok: false; error: string };

/**
 * 루틴 저장 시 본운동/워밍업/마무리 자동 채우기 방식.
 * -"recommend": 추천 운동으로 일괄 채움
 * -"manual": 자동으로 안 채움 → /plan 에서 부위별 직접 등록
 * -"byMuscle": 자동으로 안 채움 → /plan/muscle 3D 마네킹에서 근육별 선택
 */
export type RoutineFillMode = "recommend" | "manual" | "byMuscle";

/**
 * 현재 사용자의 루틴을 저장(없으면 생성, 있으면 갱신)합니다.
 * variantId 가"custom" 이면 customWeek(블록 id 배열 ×7)를 함께 저장합니다.
 * 멀티 부위 일자 지원: customWeek 는`DayBlockId[][]` (각 요일에 1개 이상 블록).
 * 구 포맷`DayBlockId[]` 도 받아 자동 정규화.
 * start_date 는 최초 생성 시에만 기록되고 변경 시 유지됩니다.
 */
export async function saveRoutineAction(
  splits: number,
  variantId: string,
  customWeek?: DayBlockId[][] | DayBlockId[] | null,
  /**
   * 운동/워밍업/마무리 자동 채우기 방식.
   * -"recommend": 비어 있는 부위는 추천 운동으로, 워밍업/마무리는 기본 추천으로 일괄 채움.
   * -"manual" (기본): 자동으로 아무것도 채우지 않음. 사용자가 /plan 에서 직접 등록.
   */
  fillMode: RoutineFillMode = "manual",
): Promise<SaveRoutineResult> {
  const isCustom = variantId === CUSTOM_VARIANT_ID;

  let normalized: DayBlockId[][] | null = null;
  if (isCustom) {
    normalized = normalizeCustomWeek(customWeek);
    if (!normalized) {
      return { ok: false, error: "커스텀 루틴 구성이 올바르지 않습니다." };
    }
  } else if (!isValidRoutine(splits, variantId)) {
    return { ok: false, error: "선택한 루틴이 올바르지 않습니다." };
  }

  const supabase = await createSupabaseServerClient();

  const user = await getCurrentUser();

  if (!user) {
    return { ok: false, error: "로그인이 필요합니다." };
  }

  // 루틴을 바꾸면 오늘만 변경/휴식 오버라이드는 의미가 없어지므로 함께 클리어.
  // '설정>루틴 설정' 저장은 곧 기준 루틴이므로 baseline_routine 도 함께 기록한다
  // ('오늘부터 다시 시작하기'가 이 기준으로 복원).
  const effSplits = isCustom ? CUSTOM_SPLITS : splits;
  const effCustomWeek = isCustom ? normalized : null;
  const { error } = await supabase.from("user_routines").upsert(
    {
      user_id: user.id,
      splits: effSplits,
      variant_id: variantId,
      custom_week: effCustomWeek,
      baseline_routine: {
        splits: effSplits,
        variant_id: variantId,
        custom_week: effCustomWeek,
      },
      rest_date: null,
      override_date: null,
      override_block: null,
      last_deferred_date: null,
      deferred_target: null,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    return { ok: false, error: error.message };
  }

  // 새 루틴으로 바꾸면 오늘 / 미래의"오늘만 변경" 오버라이드도 모두 무효화해야 한다.
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

  //"추천으로 채우기" 선택 시에만 자동 채우기 실행."직접 등록"이면 건드리지 않음.
  if (fillMode === "recommend") {
    await fillMissingFocusesAction(user.id, splits, variantId, normalized);
    await registerRecommendedConditioningAction();
  }

  // 루틴 구조가 바뀌었으니 기존 운동의 day_index 를 새 루틴 일차에 맞춰 재정렬.
  await syncRoutineExerciseDays(
    user.id,
    isCustom ? CUSTOM_SPLITS : splits,
    variantId,
    normalized,
  );

  revalidatePath("/routine");
  revalidatePath("/settings/routine");
  revalidatePath("/plan");
  revalidatePath("/plan/today");
  return { ok: true };
}

/**
 * 새 루틴의 (일차, 부위) 슬롯 중 등록된 운동이 없는 슬롯에만 추천 운동을 자동 등록.
 * 기존에 운동이 있는 일차·부위는 건드리지 않음 (사용자 커스터마이즈 보존).
 * 보조(사이드) 슬롯은 2개만 채운다.
 */
async function fillMissingFocusesAction(
  userId: string,
  splits: number,
  variantId: string,
  customWeek: DayBlockId[][] | null,
): Promise<void> {
  const profile = await getUserProfile();
  if (!profile) return;

  const slots = routineDaySlots(splits, variantId, customWeek);
  if (slots.length === 0) return;

  const supabase = await createSupabaseServerClient();
  // 기존 행의 (day_index, focus) 쌍 조회
  const { data: existing } = await supabase
    .from("routine_exercises")
    .select("day_index, focus")
    .eq("user_id", userId);
  const existingPairs = new Set(
    (existing ?? []).map(
      (r: { day_index: number | null; focus: string }) =>
        `${r.day_index}:${r.focus}`,
    ),
  );

  // 비어 있는 슬롯만 추천으로 채움
  const missing = slots.filter(
    (s) => !existingPairs.has(`${s.dayIndex}:${s.focus}`),
  );
  if (missing.length === 0) return;

  const opts = {
    gender: profile.gender,
    experience: profile.experience,
    bodyType: profile.bodyType ?? ("average" as const),
    weightKg: profile.weightKg ?? 65,
  };
  const rows = missing.flatMap((slot) => {
    const list = slot.isSide
      ? sideExercisesForSlot(slot.focus, slot.blockIds, profile.gender)
      : focusExercisesForSlot(slot.focus, slot.blockIds, profile.gender);
    return list.map((ex, index) => {
      const p = prescribe(ex.id, opts);
      return {
        user_id: userId,
        day_index: slot.dayIndex,
        focus: slot.focus,
        position: index,
        exercise_id: ex.id,
        equipment: ex.equipments[0].equipment,
        sets: p.sets,
        reps: p.reps,
        weight_kg: p.weightKg,
      };
    });
  });
  if (rows.length > 0) {
    await supabase.from("routine_exercises").insert(rows);
  }
}

/**
 *"다가오는 7일" 카드를 드래그로 재배열한 결과를 그대로 루틴으로 저장.
 * - splits/variantId 를 커스텀으로 전환하고 customWeek = 전달된 7일치 부위 배열
 * - start_date 를 오늘로 재설정 → 변경된 첫째 칸이 곧"오늘"이 됨
 * - `order` 가 오면(order[newPos]=원래 day_index) 본운동의 day_index 도 카드를 따라
 *   옮긴다 → 같은 부위(예: 하체)가 여러 일차에 있어도, 1일차 운동을 0일차로 끌면
 *   그 운동들이 오늘 화면에 뜬다. (부위 배열만으로는 복원 불가해 순열을 함께 받음)
 * - 오늘 이후의 daily_plan / daily_conditioning 오버라이드는 새 루틴과 맞지 않을 수 있어 정리
 */
export async function reorderUpcomingSevenDaysAction(
  blocks: DayBlockId[][],
  order?: number[],
): Promise<SaveRoutineResult> {
  if (!Array.isArray(blocks) || blocks.length !== 7) {
    return { ok: false, error: "7일치 데이터가 필요합니다." };
  }
  for (const day of blocks) {
    if (!Array.isArray(day) || day.length === 0) {
      return { ok: false, error: "각 일자에 최소 1개 부위가 필요합니다." };
    }
    for (const b of day) {
      if (!isDayBlockId(b)) {
        return { ok: false, error: "부위 값이 올바르지 않습니다." };
      }
    }
  }

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const today = seoulYmd();

  const { error } = await supabase.from("user_routines").upsert(
    {
      user_id: user.id,
      splits: CUSTOM_SPLITS,
      variant_id: CUSTOM_VARIANT_ID,
      custom_week: blocks,
      start_date: today,
      rest_date: null,
      override_date: null,
      override_block: null,
      last_deferred_date: null,
      deferred_target: null,
    },
    { onConflict: "user_id" },
  );
  if (error) return { ok: false, error: error.message };

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

  // 드래그 순열대로 본운동의 day_index 를 카드와 함께 옮긴다. start_date=오늘 이라
  // 저장 후 (day_index == 화면 위치). order 가 없거나 순열이 아니면 무동작(빈 매핑).
  if (Array.isArray(order)) {
    const { data: rows } = await supabase
      .from("routine_exercises")
      .select("id, day_index")
      .eq("user_id", user.id);
    const remap = planDayIndexRemap(
      (rows ?? []) as { id: string; day_index: number | null }[],
      order,
    );
    // 목적지 day_index 별로 묶어 id 로 갱신. 원래 스냅샷 기준이라 충돌 없음
    // (컬럼값으로 필터하면 이미 옮긴 행까지 다시 잡혀 섞인다 — 반드시 id 필터).
    const idsByDay = new Map<number, string[]>();
    for (const u of remap) {
      const arr = idsByDay.get(u.dayIndex) ?? [];
      arr.push(u.id);
      idsByDay.set(u.dayIndex, arr);
    }
    for (const [dayIndex, ids] of idsByDay) {
      await supabase
        .from("routine_exercises")
        .update({ day_index: dayIndex })
        .in("id", ids);
    }
  }

  // 부위 배치가 바뀌었으니 day_index 정합성 보정(비어버린 일차 채우기/드리프트 수리).
  await syncRoutineExerciseDays(user.id, CUSTOM_SPLITS, CUSTOM_VARIANT_ID, blocks);

  revalidatePath("/routine");
  revalidatePath("/settings/routine");
  revalidatePath("/plan");
  return { ok: true };
}

/**
 * "오늘부터 다시 시작하기" — 처음 설정한 루틴으로 되돌린다.
 * 기준일을 오늘로 리셋해 오늘이 1일차가 되고, 그동안 쌓인 임시 변경
 * (오늘만 운동 변경=daily_plan / daily_conditioning, 오늘 휴식, 오늘만 부위 변경)을
 * 오늘 이후 범위에서 모두 지워 기본 루틴이 그대로 보이게 한다. (지난 기록은 보존)
 */
export async function restartRoutineFromTodayAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return;

  const today = seoulYmd();

  // 기준(설정) 루틴 스냅샷을 읽어, 그동안 '다가오는 7일' 드래그 등으로 바뀐
  // 현재 루틴을 기준 루틴으로 복원한다. (스냅샷 없으면 주기만 오늘로 리셋)
  const { data: cur } = await supabase
    .from("user_routines")
    .select("baseline_routine")
    .eq("user_id", user.id)
    .maybeSingle();
  const baseline = (cur as { baseline_routine?: unknown } | null)
    ?.baseline_routine as
    | { splits?: number; variant_id?: string; custom_week?: unknown }
    | null
    | undefined;

  const update: Record<string, unknown> = {
    start_date: today,
    rest_date: null,
    override_date: null,
    override_block: null,
    last_deferred_date: null,
    deferred_target: null,
  };
  const restoredBaseline =
    baseline &&
    typeof baseline.splits === "number" &&
    typeof baseline.variant_id === "string";
  if (restoredBaseline) {
    update.splits = baseline!.splits;
    update.variant_id = baseline!.variant_id;
    update.custom_week = baseline!.custom_week ?? null;
  }

  await supabase
    .from("user_routines")
    .update(update)
    .eq("user_id", user.id);

  // 오늘 이후의 '오늘만 변경' 오버라이드 제거 → 기본(처음 설정한) 루틴으로 복귀.
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

  // 기준 루틴으로 구조가 바뀌었으면 day_index 도 그 루틴에 맞춰 재정렬.
  if (restoredBaseline) {
    await syncRoutineExerciseDays(
      user.id,
      baseline!.splits as number,
      baseline!.variant_id as string,
      (baseline!.custom_week ?? null) as DayBlockId[][] | null,
    );
  }

  revalidatePath("/routine");
}

/**
 * 오늘을 휴식으로 전환하고 루틴을 하루 미룬다.
 * 기준일 +1일 → 오늘 예정이던 운동이 내일로 이동, 오늘은 휴식 표시.
 */
/**
 * "오늘만 변경(전체 바꾸기/직접 담기)" 용 — **루틴 원본은 절대 건드리지 않는다.**
 * 오늘 하루만 override 로 바꾸고, 오늘이 지나면 자동으로 원래 루틴으로 돌아간다.
 * (start_date 등 루틴을 밀지 않는다 — '오늘만' 이므로 내일부턴 그대로.)
 *
 * 동작: 오늘을 last_deferred_date 마커로 '변경된 날'로 표시 → page 가 오늘 원래 루틴
 * 운동을 숨긴다(완료 기록은 보존). deferred_target(직접/부위)을 기억해 '운동 등록하기'
 * 링크를 그 흐름으로 보낸다. 오늘 워밍업/마무리 오버라이드도 비운다(본운동 daily_plan 은
 * 호출측 clearDailyPlanForDateAction 이 비움). 마커는 날짜가 지나면 자연히 무효.
 */
export async function deferRoutineOneDayAction(
  target?: string,
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return;

  const today = seoulYmd();

  // 오늘 워밍업/마무리 오버라이드 비우기.
  await supabase
    .from("daily_conditioning")
    .delete()
    .eq("user_id", user.id)
    .eq("for_date", today);

  // 오늘을 '변경된 날'로만 마킹 — 루틴(start_date)은 그대로. 오늘 지나면 자동 복귀.
  await supabase
    .from("user_routines")
    .update({
      last_deferred_date: today,
      deferred_target: target ?? null,
      rest_date: null,
      override_date: null,
      override_block: null,
    })
    .eq("user_id", user.id);
  revalidatePath("/routine");
  revalidatePath("/plan/today");
}

export async function convertTodayToRestAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
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

  revalidatePath("/routine");
}

/**
 *"다시 운동하기" — convertTodayToRest 의 반대.
 * 오늘이 휴식 상태(rest_date == 오늘)인 경우에만:
 * start_date 를 -1 일 되돌리고 rest_date 를 null 로.
 * 직전에 표시되던 운동 데이터가 다시 오늘로 돌아온다.
 */
export async function undoTodayRestAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
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

  revalidatePath("/routine");
}

/**
 * 오늘 하루만 다른 부위로 변경한다(루틴은 밀지 않음).
 * override_date=오늘, override_block=선택 부위. 내일부터는 원래 루틴 유지.
 */
export async function setTodayFocusAction(blockId: DayBlockId): Promise<void> {
  if (!isDayBlockId(blockId)) return;

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return;

  await supabase
    .from("user_routines")
    .update({
      override_date: seoulYmd(),
      override_block: blockId,
      rest_date: null,
    })
    .eq("user_id", user.id);

  revalidatePath("/routine");
}
