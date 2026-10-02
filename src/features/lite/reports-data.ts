import "server-only";

import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { seoulYmd } from "@/features/routine/data";
import { getUserProfile } from "@/features/profile/data-access";
import { ageOf } from "@/features/profile/survey-extra";
import { dailyTarget } from "@/features/diet/calorie-target";
import { dailyWaterTargetMl } from "@/features/diet/water";
import { goalKcal } from "@/features/coach/diet-coach";
import { isCheckin, type Checkin } from "@/features/routine/checkin";
import { recordVolume, type ProgressRecord } from "@/features/routine/progress";
import type { SetDetail } from "@/features/routine/set-details";
import {
  bodyCompReport,
  conditionReport,
  dietMonthReport,
  weeklyHabitReport,
  type BodyCompReport,
  type ConditionReport,
  type DietMonthReport,
  type WeeklyHabitReport,
} from "@/features/lite/reports";

export type LiteReports = {
  body: BodyCompReport;
  condition: ConditionReport;
  diet: DietMonthReport;
  dietTarget: { kcal: number; proteinG: number };
  habits: WeeklyHabitReport;
};

const num = (v: unknown) => (v == null ? null : Number.isFinite(Number(v)) ? Number(v) : null);

function addDays(ymd: string, n: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * 라이트 리포트 4종(체성분·컨디션·식단 월간·수분/걸음 주간) — 맞춤 운동 앱 리포트 탭에서만 읽는다.
 * 하나가 실패해도 나머지는 보이게 각 조회를 따로 받는다(빈 리포트로).
 */
export async function loadLiteReports(): Promise<LiteReports | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createSupabaseServerClient();
  const today = seoulYmd();
  const month = today.slice(0, 7);
  const from28 = addDays(today, -27);
  const from14 = addDays(today, -13);
  const fromDone = from28 < `${month}-01` ? from28 : `${month}-01`;

  const [profile, body, checks, done, food, water, steps] = await Promise.all([
    getUserProfile().catch(() => null),
    supabase
      .from("body_compositions")
      .select("measured_at, weight_kg, skeletal_muscle_kg, body_fat_kg, body_fat_pct")
      .eq("user_id", user.id)
      .order("measured_at", { ascending: false })
      .limit(24),
    supabase.from("daily_checkins").select("for_date, sleep, soreness, energy").eq("user_id", user.id).gte("for_date", from28),
    supabase
      .from("exercise_completions")
      .select("exercise_id, for_date, sets, reps, weight_kg, set_details, equipment")
      .eq("user_id", user.id)
      .eq("status", "done")
      .gte("for_date", fromDone)
      .lte("for_date", today),
    supabase
      .from("food_logs")
      .select("for_date, name, kcal, protein_g, carbs_g, fat_g")
      .eq("user_id", user.id)
      .gte("for_date", `${month}-01`)
      .lte("for_date", today),
    supabase.from("water_logs").select("for_date, ml").eq("user_id", user.id).gte("for_date", from14),
    supabase.from("daily_steps").select("for_date, steps").eq("user_id", user.id).gte("for_date", from14),
  ]);

  const rows = <T,>(r: { data: unknown }) => ((r.data ?? []) as T[]);

  const bodyRows = rows<Record<string, unknown>>(body).map((r) => ({
    date: String(r.measured_at),
    weightKg: num(r.weight_kg),
    muscleKg: num(r.skeletal_muscle_kg),
    fatKg: num(r.body_fat_kg),
    fatPct: num(r.body_fat_pct),
  }));

  const volumeByDate = new Map<string, number>();
  const workoutDates = new Set<string>();
  for (const r of rows<Record<string, unknown>>(done)) {
    const rec: ProgressRecord = {
      forDate: String(r.for_date),
      exerciseId: (r.exercise_id as string | null) ?? null,
      status: "done",
      sets: num(r.sets),
      reps: num(r.reps),
      weightKg: num(r.weight_kg),
      setDetails: Array.isArray(r.set_details) ? (r.set_details as SetDetail[]) : null,
      equipment: (r.equipment as string | null) ?? null,
    };
    workoutDates.add(rec.forDate);
    volumeByDate.set(rec.forDate, (volumeByDate.get(rec.forDate) ?? 0) + recordVolume(rec));
  }

  const checkins: (Checkin & { date: string })[] = rows<Record<string, unknown>>(checks).flatMap((r) =>
    isCheckin(r) ? [{ sleep: r.sleep, soreness: r.soreness, energy: r.energy, date: String((r as { for_date?: unknown }).for_date) }] : [],
  );

  const gender = profile?.gender === "female" ? "female" : "male";
  const base = dailyTarget({
    gender,
    weightKg: profile?.weightKg ?? null,
    heightCm: profile?.heightCm ?? null,
    age: ageOf(profile?.ageGroup ?? null),
  });
  const dietTarget = { kcal: goalKcal(base, profile?.goal ?? null, gender), proteinG: base.protein };
  const foodRows = rows<Record<string, unknown>>(food).map((r) => ({
    date: String(r.for_date),
    name: String(r.name ?? ""),
    kcal: num(r.kcal) ?? 0,
    proteinG: num(r.protein_g) ?? 0,
    carbsG: num(r.carbs_g) ?? 0,
    fatG: num(r.fat_g) ?? 0,
  }));

  const toMap = (list: Record<string, unknown>[], key: string) =>
    new Map(list.map((r) => [String(r.for_date), num(r[key]) ?? 0]));

  return {
    body: bodyCompReport(bodyRows),
    condition: conditionReport(checkins, volumeByDate, today),
    diet: dietMonthReport(foodRows, month, dietTarget, workoutDates),
    dietTarget,
    habits: weeklyHabitReport(
      toMap(rows(water), "ml"),
      toMap(rows(steps), "steps"),
      today,
      dailyWaterTargetMl(profile?.weightKg ?? null),
    ),
  };
}
