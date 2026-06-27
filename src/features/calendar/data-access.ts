import "server-only";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { getUserProfile } from "@/features/profile/data-access";
import {
  estimateStrengthKcal,
  estimateConditioningKcal,
} from "@/features/routine/calories";
import { getWorkoutDurationsRange } from "@/features/workout-timer/workout-sessions";
import { getCatalogExercise } from "@/features/routine/exercise-catalog";
import { getConditioningItem } from "@/features/routine/conditioning-catalog";
import { basalMetabolicRate } from "@/features/diet/calorie-target";
import { getFoodLogsForDate, type FoodLog } from "@/features/diet/data-access";

const num = (v: number | string | null | undefined): number => {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export type DaySummary = {
  intake: number;
  burned: number; // 운동 소비
  durationSec: number;
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
      s = { intake: 0, burned: 0, durationSec: 0 };
      byDate.set(d, s);
    }
    return s;
  };

  if (!user) return { byDate, intakeTotal: 0, workoutBurnedTotal: 0, bmr };
  const supabase = await createSupabaseServerClient();

  const [foodRes, exRes, condRes, durMap] = await Promise.all([
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
    ensure(r.for_date).burned += estimateStrengthKcal(weight, r.exercise_id, num(r.sets));
  }
  for (const r of (condRes.data ?? []) as {
    for_date: string;
    item_id: string | null;
    duration_min: number | null;
    speed: number | string | null;
  }[]) {
    if (!r.item_id) continue;
    ensure(r.for_date).burned += estimateConditioningKcal(
      weight,
      r.item_id,
      r.duration_min,
      r.speed === null ? null : num(r.speed),
    );
  }
  for (const [date, sec] of durMap) ensure(date).durationSec = sec;

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
    foods,
    workouts: [],
    conditioning: [],
  };
  if (!user) return empty;
  const supabase = await createSupabaseServerClient();

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

  let burned = 0;
  const workouts = ((exRes.data ?? []) as {
    exercise_id: string | null;
    sets: number | null;
    reps: number | null;
    weight_kg: number | string | null;
  }[])
    .filter((r) => r.exercise_id)
    .map((r) => {
      const kcal = Math.round(estimateStrengthKcal(weight, r.exercise_id!, num(r.sets)));
      burned += kcal;
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
      const kcal = Math.round(
        estimateConditioningKcal(
          weight,
          r.item_id!,
          r.duration_min,
          r.speed === null ? null : num(r.speed),
        ),
      );
      burned += kcal;
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

  return { intake, burned, durationSec, foods, workouts, conditioning };
}
