import "server-only";

import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { seoulYmd } from "@/features/routine/data";
import { resolvePlan } from "@/features/billing/plan-store";
import { hasPlan } from "@/features/billing/plans";
import { fetchAllPages } from "@/lib/batch";
import { prEvents } from "@/features/routine/fit-growth";
import { recordVolume, type ProgressRecord } from "@/features/routine/progress";
import { parseSetDetails } from "@/features/routine/set-details";
import { mondayOf, yearReview, YEAR_WEEKS, type YearReview } from "@/features/lite/year-review";

export type YearReviewView = YearReview & { full: boolean };

const num = (v: unknown) => (v == null ? null : Number.isFinite(Number(v)) ? Number(v) : null);

/** 1년 돌아보기 — `/fit/year` 와 공유 이미지에서만 읽는다(리포트 탭에서 1년치를 읽지 않게). */
export async function loadYearReview(): Promise<YearReviewView | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createSupabaseServerClient();
  const today = seoulYmd();
  const from = new Date(Date.parse(`${mondayOf(today)}T00:00:00Z`) - (YEAR_WEEKS - 1) * 7 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const [rows, plan] = await Promise.all([
    fetchAllPages<Record<string, unknown>>((a, b) =>
      supabase
        .from("exercise_completions")
        .select("exercise_id, for_date, sets, reps, weight_kg, set_details")
        .eq("user_id", user.id)
        .eq("status", "done")
        .gte("for_date", from)
        .lte("for_date", today)
        .range(a, b),
    ),
    resolvePlan(),
  ]);
  const records: ProgressRecord[] = rows.map((r) => ({
    forDate: String(r.for_date),
    exerciseId: (r.exercise_id as string | null) ?? null,
    status: "done",
    sets: num(r.sets),
    reps: num(r.reps),
    weightKg: num(r.weight_kg),
    setDetails: parseSetDetails(r.set_details),
  }));
  const dayVolume = new Map<string, number>();
  const exDays = new Map<string, Set<string>>();
  for (const r of records) {
    dayVolume.set(r.forDate, (dayVolume.get(r.forDate) ?? 0) + recordVolume(r));
    if (r.exerciseId) {
      const s = exDays.get(r.exerciseId) ?? new Set<string>();
      s.add(r.forDate);
      exDays.set(r.exerciseId, s);
    }
  }
  const exerciseDays = new Map([...exDays.entries()].map(([id, s]) => [id, s.size]));
  return {
    ...yearReview(dayVolume, exerciseDays, prEvents(records, 500), today),
    full: hasPlan(plan, "lite"),
  };
}
