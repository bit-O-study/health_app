import "server-only";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { getUserProfile } from "@/features/profile/data-access";
import {
  strengthKcalForCompletion,
  estimateConditioningKcal,
} from "@/features/routine/calories";
import { getWorkoutDurationsRange } from "@/features/workout-timer/workout-sessions";
import { getCatalogExercise } from "@/features/routine/exercise-catalog";
import {
  conditioningDefaults,
  getConditioningItem,
} from "@/features/routine/conditioning-catalog";
import { basalMetabolicRate } from "@/features/diet/calorie-target";
import { getFoodLogsForDate, type FoodLog } from "@/features/diet/data-access";
import { getStepsRange, getStepsForDate } from "@/features/health/steps-data";
import { stepsToKcal } from "@/features/health/steps-calories";

const num = (v: number | string | null | undefined): number => {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export type DaySummary = {
  intake: number;
  burned: number; // 활동 소비(운동 + 걸음 칼로리)
  durationSec: number;
  steps: number; // 그날 걸음수
};

export type MonthlyCalendar = {
  byDate: Map<string, DaySummary>;
  intakeTotal: number;
  workoutBurnedTotal: number;
  bmr: number;
};

function profileGender(g: unknown): "male" | "female" {
  return g === "female" ? "female" : "male";
}

/** 한 달(from~to) 일자별 섭취·운동소비·운동시간 집계 + 기초대사량. */
export async function getMonthlyCalendar(
  from: string,
  to: string,
): Promise<MonthlyCalendar> {
  const user = await getCurrentUser();
  const profile = await getUserProfile();
  const weight = profile?.weightKg ?? 65;
  const bmr = profile
    ? basalMetabolicRate({
        gender: profileGender(profile.gender),
        weightKg: profile.weightKg,
        heightCm: profile.heightCm,
      })
    : 1500;

  const byDate = new Map<string, DaySummary>();
  const ensure = (d: string): DaySummary => {
    let s = byDate.get(d);
    if (!s) {
      s = { intake: 0, burned: 0, durationSec: 0, steps: 0 };
      byDate.set(d, s);
    }
    return s;
  };

  if (!user) return { byDate, intakeTotal: 0, workoutBurnedTotal: 0, bmr };
  const supabase = await createSupabaseServerClient();

  const [foodRes, exRes, condRes, durMap, stepsMap] = await Promise.all([
    supabase
      .from("food_logs")
      .select("for_date, kcal")
      .eq("user_id", user.id)
      .gte("for_date", from)
      .lte("for_date", to),
    supabase
      .from("exercise_completions")
      .select("for_date, exercise_id, sets")
      .eq("user_id", user.id)
      .eq("status", "done")
      .gte("for_date", from)
      .lte("for_date", to),
    supabase
      .from("conditioning_completions")
      .select("for_date, item_id, duration_min, speed")
      .eq("user_id", user.id)
      .eq("status", "done")
      .gte("for_date", from)
      .lte("for_date", to),
    getWorkoutDurationsRange(from, to),
    getStepsRange(from, to),
  ]);

  for (const r of (foodRes.data ?? []) as { for_date: string; kcal: number | string }[]) {
    ensure(r.for_date).intake += num(r.kcal);
  }
  for (const r of (exRes.data ?? []) as {
    for_date: string;
    exercise_id: string | null;
    sets: number | null;
  }[]) {
    if (!r.exercise_id) continue;
    ensure(r.for_date).burned += strengthKcalForCompletion(weight, r.exercise_id, num(r.sets));
  }
  for (const r of (condRes.data ?? []) as {
    for_date: string;
    item_id: string | null;
    duration_min: number | null;
    speed: number | string | null;
  }[]) {
    if (!r.item_id) continue;
    // 스냅샷이 비면 카탈로그 기본값으로 보정 — 메인 화면 '완료 kcal' 과 일치하게.
    const d = conditioningDefaults(r.item_id);
    ensure(r.for_date).burned += estimateConditioningKcal(
      weight,
      r.item_id,
      r.duration_min ?? d.durationMin,
      r.speed === null ? d.speed : num(r.speed),
    );
  }
  for (const [date, sec] of durMap) ensure(date).durationSec = sec;
  // 걸음수 → 그날 소비 칼로리에 가산 + 걸음수 저장.
  for (const [date, steps] of stepsMap) {
    const s = ensure(date);
    s.steps = steps;
    s.burned += stepsToKcal(steps, weight);
  }

  let intakeTotal = 0;
  let workoutBurnedTotal = 0;
  for (const s of byDate.values()) {
    s.intake = Math.round(s.intake);
    s.burned = Math.round(s.burned);
    intakeTotal += s.intake;
    workoutBurnedTotal += s.burned;
  }

  return { byDate, intakeTotal, workoutBurnedTotal, bmr };
}

export type DayDetail = {
  intake: number;
  burned: number;
  durationSec: number;
  steps: number;
  stepsKcal: number;
  foods: FoodLog[];
  workouts: { name: string; sets: number; reps: number; weightKg: number | null; kcal: number }[];
  conditioning: { name: string; detail: string; kcal: number }[];
};

/** 한 날짜의 상세: 식단 + 완료 운동 + 컨디셔닝 + 운동시간. */
export async function getDayDetail(dateYmd: string): Promise<DayDetail> {
  const user = await getCurrentUser();
  const profile = await getUserProfile();
  const weight = profile?.weightKg ?? 65;
  const foods = await getFoodLogsForDate(dateYmd);
  const intake = Math.round(foods.reduce((s, f) => s + f.kcal, 0));

  const empty: DayDetail = {
    intake,
    burned: 0,
    durationSec: 0,
    steps: 0,
    stepsKcal: 0,
    foods,
    workouts: [],
    conditioning: [],
  };
  if (!user) return empty;
  const supabase = await createSupabaseServerClient();
  const steps = (await getStepsForDate(dateYmd)) ?? 0;
  const stepsKcal = stepsToKcal(steps, weight);

  const [exRes, condRes, durRes] = await Promise.all([
    supabase
      .from("exercise_completions")
      .select("exercise_id, sets, reps, weight_kg")
      .eq("user_id", user.id)
      .eq("for_date", dateYmd)
      .eq("status", "done"),
    supabase
      .from("conditioning_completions")
      .select("item_id, duration_min, speed, incline, sets, reps")
      .eq("user_id", user.id)
      .eq("for_date", dateYmd)
      .eq("status", "done"),
    supabase
      .from("workout_sessions")
      .select("duration_sec")
      .eq("user_id", user.id)
      .eq("for_date", dateYmd)
      .maybeSingle(),
  ]);

  // 합계는 raw로 누적해 마지막에 한 번만 반올림한다(월간 집계·운동모드 총합과 동일한 방식).
  // 항목별 표시 kcal은 보기 좋게 개별 반올림하되, burned 총합에는 raw를 더한다.
  let burnedRaw = 0;
  const workouts = ((exRes.data ?? []) as {
    exercise_id: string | null;
    sets: number | null;
    reps: number | null;
    weight_kg: number | string | null;
  }[])
    .filter((r) => r.exercise_id)
    .map((r) => {
      const raw = strengthKcalForCompletion(weight, r.exercise_id!, num(r.sets));
      burnedRaw += raw;
      const kcal = Math.round(raw);
      return {
        name: getCatalogExercise(r.exercise_id!)?.name ?? r.exercise_id!,
        sets: num(r.sets),
        reps: num(r.reps),
        weightKg: r.weight_kg === null ? null : num(r.weight_kg),
        kcal,
      };
    });

  const conditioning = ((condRes.data ?? []) as {
    item_id: string | null;
    duration_min: number | null;
    speed: number | string | null;
    incline: number | string | null;
    sets: number | null;
    reps: number | null;
  }[])
    .filter((r) => r.item_id)
    .map((r) => {
      const dd = conditioningDefaults(r.item_id!);
      const raw = estimateConditioningKcal(
        weight,
        r.item_id!,
        r.duration_min ?? dd.durationMin,
        r.speed === null ? dd.speed : num(r.speed),
      );
      burnedRaw += raw;
      const kcal = Math.round(raw);
      const item = getConditioningItem(r.item_id!);
      const parts: string[] = [];
      if (r.duration_min != null) parts.push(`${r.duration_min}분`);
      if (r.sets != null) parts.push(`${r.sets}세트`);
      if (r.reps != null) parts.push(`${r.reps}회`);
      return {
        name: item?.name ?? r.item_id!,
        detail: parts.join(" · "),
        kcal,
      };
    });

  const durationSec = Math.max(
    0,
    num((durRes.data as { duration_sec?: number } | null)?.duration_sec),
  );

  const burned = Math.round(burnedRaw) + stepsKcal; // 운동 + 걸음 칼로리
  return {
    intake,
    burned,
    durationSec,
    steps,
    stepsKcal,
    foods,
    workouts,
    conditioning,
  };
}
