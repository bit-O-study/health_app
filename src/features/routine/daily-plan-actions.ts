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
import {
  isValidSetDetails,
  toRowFields,
  type SetDetail,
} from "@/features/routine/set-details";
import {
  DAY_BLOCKS,
  resolveRoutine,
  routineDayOffset,
  seoulYmd,
  type FocusTone,
} from "@/features/routine/data";
import { getUserRoutine } from "@/features/routine/data-access";
import { getPlanForDay } from "@/features/routine/plan";

export type DailyPlanItem = {
  exerciseId: string;
  equipment: EquipmentId;
  sets: number;
  reps: number;
  weightKg: number | null;
  /** 세트별 무게·횟수. 있으면 sets/reps/weightKg 대신 사용. */
  setDetails?: SetDetail[] | null;
};

export type SaveDailyPlanResult = { ok: true } | { ok: false; error: string };

function isValidYmd(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/**
 * "오늘만 부위 추가" 준비 — 오늘의 기존 루틴 부위들을 daily_plan 으로 고정(pin)한다.
 *
 * "오늘만 변경"은 daily_plan 이 그날 부위를 '대체'하는 구조라, 그냥 새 부위만 추가하면
 * 기존 루틴 부위가 화면에서 사라진다(대체돼서). 그래서 추가 모드에서는 현재 루틴 부위의
 * 오늘 운동을 daily_plan 으로 복사해 둔 뒤(이미 오버라이드된 부위는 건드리지 않음), 그
 * 위에 새 부위를 더하면 today 화면이 (기존 + 추가) 합집합으로 보인다. 완료 기록은 그대로.
 */
export async function pinRoutineFocusesForTodayAction(): Promise<SaveDailyPlanResult> {
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const routine = await getUserRoutine();
  if (!routine) return { ok: false, error: "루틴이 없습니다." };

  const today = seoulYmd();
  const { variant } = resolveRoutine(
    routine.splits,
    routine.variantId,
    routine.customWeek,
  );
  const offset = routineDayOffset(routine.startDate, today);
  const overriddenToday =
    routine.overrideDate === today && routine.overrideBlock !== null;
  const planToday = overriddenToday
    ? DAY_BLOCKS[routine.overrideBlock!].day
    : variant.week[offset];
  const routineTones = (planToday.tones ?? [planToday.tone]).filter(
    (t): t is Exclude<FocusTone, "rest"> => t !== "rest",
  );
  if (routineTones.length === 0) return { ok: true };

  // 이미 daily_plan 오버라이드가 있는 부위는 그대로 둔다(중복 고정 방지).
  const { data: existing } = await supabase
    .from("daily_plan")
    .select("focus")
    .eq("user_id", user.id)
    .eq("for_date", today);
  const pinned = new Set(
    ((existing ?? []) as { focus: string }[]).map((r) => r.focus),
  );

  for (const tone of routineTones) {
    if (pinned.has(tone)) continue;
    const dayPlan = await getPlanForDay(offset, tone);
    if (dayPlan.length === 0) continue; // 등록 운동 없는 부위는 고정할 것도 없음
    const rows = dayPlan.map((p, index) => ({
      user_id: user.id,
      for_date: today,
      focus: tone,
      position: index,
      exercise_id: p.exerciseId,
      equipment: p.equipment,
      ...toRowFields({
        sets: p.sets,
        reps: p.reps,
        weightKg: p.weightKg,
        setDetails: p.setDetails,
      }),
      memo: p.memo,
    }));
    const ins = await supabase.from("daily_plan").insert(rows);
    if (ins.error) return { ok: false, error: ins.error.message };
  }

  revalidatePath("/routine");
  revalidatePath("/plan/today");
  return { ok: true };
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

  revalidatePath("/routine");
  revalidatePath("/plan/today");
  return { ok: true };
}

/**
 * "오늘만 상태 해제" — 오늘 하루에 걸린 임시 변경을 모두 비워 오늘을 기본 루틴으로 되돌린다.
 * (루틴 정의·다른 날짜는 건드리지 않는다.) 완료 기록(exercise/conditioning completions)은 보존.
 *  - daily_plan / daily_conditioning(오늘) 삭제
 *  - user_routines 의 오늘 단일 마커(override_date/override_block, rest_date) 해제
 */
export async function exitTodayOnlyAction(): Promise<SaveDailyPlanResult> {
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const today = seoulYmd();

  const [dp, dc, ov, rd] = await Promise.all([
    supabase.from("daily_plan").delete().eq("user_id", user.id).eq("for_date", today),
    supabase
      .from("daily_conditioning")
      .delete()
      .eq("user_id", user.id)
      .eq("for_date", today),
    supabase
      .from("user_routines")
      .update({ override_date: null, override_block: null })
      .eq("user_id", user.id)
      .eq("override_date", today),
    supabase
      .from("user_routines")
      .update({ rest_date: null })
      .eq("user_id", user.id)
      .eq("rest_date", today),
  ]);
  const err = dp.error || dc.error || ov.error || rd.error;
  if (err) return { ok: false, error: err.message };

  revalidatePath("/routine");
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
    if (it.setDetails && it.setDetails.length > 0) {
      if (!isValidSetDetails(it.setDetails)) {
        return { ok: false, error: "세트별 무게/횟수 값이 올바르지 않습니다." };
      }
    } else if (
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
      ...toRowFields(it),
    }));
    const ins = await supabase.from("daily_plan").insert(rows);
    if (ins.error) return { ok: false, error: ins.error.message };
  }

  revalidatePath("/routine");
  revalidatePath("/plan/today");
  return { ok: true };
}
