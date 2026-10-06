import "server-only";

import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { seoulYmd } from "@/features/routine/data";
import { resolvePlan } from "@/features/billing/plan-store";
import { getCatalogExercise } from "@/features/routine/exercise-catalog";
import { oneRMSeries, topExercisesByVolume, type Point, type ProgressRecord } from "@/features/routine/progress";
import type { SetDetail } from "@/features/routine/set-details";
import {
  defaultTargetDate,
  goalLimit,
  goalProgress,
  suggestTargetKg,
  type GoalProgress,
  type LiftGoal,
} from "@/features/lite/goal-progress";

export type GoalView = LiftGoal & { name: string; progress: GoalProgress };
export type GoalCandidate = { exerciseId: string; name: string; currentKg: number; suggestKg: number };
export type GoalsView = {
  goals: GoalView[];
  /** 진행 중 목표 수와 한도(무료 1 · 라이트 3). */
  active: number;
  limit: number;
  /** 라이트 이상 — 예상 도달일·필요 속도가 보인다. */
  full: boolean;
  candidates: GoalCandidate[];
  defaultDate: string;
  today: string;
};

const DAYS_BACK = 120;
const num = (v: unknown) => (v == null ? null : Number.isFinite(Number(v)) ? Number(v) : null);

function addDays(ymd: string, n: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** 최근 120일 무게 기록 — 목표 진행률·후보 종목·시작값이 모두 이걸 본다. */
export async function loadLiftRecords(userId: string): Promise<ProgressRecord[]> {
  const supabase = await createSupabaseServerClient();
  const today = seoulYmd();
  const { data } = await supabase
    .from("exercise_completions")
    .select("exercise_id, for_date, sets, reps, weight_kg, set_details, equipment")
    .eq("user_id", userId)
    .eq("status", "done")
    .gte("for_date", addDays(today, -DAYS_BACK))
    .lte("for_date", today);
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    forDate: String(r.for_date),
    exerciseId: (r.exercise_id as string | null) ?? null,
    status: "done" as const,
    sets: num(r.sets),
    reps: num(r.reps),
    weightKg: num(r.weight_kg),
    setDetails: Array.isArray(r.set_details) ? (r.set_details as SetDetail[]) : null,
    equipment: (r.equipment as string | null) ?? null,
  }));
}

export function latestOneRm(series: readonly Point[]): number {
  return series.length ? series[series.length - 1].value : 0;
}

export function rowToGoal(r: Record<string, unknown>): LiftGoal {
  return {
    id: String(r.id),
    exerciseId: String(r.exercise_id),
    startKg: Number(r.start_kg),
    targetKg: Number(r.target_kg),
    startDate: String(r.start_date),
    targetDate: String(r.target_date),
    achievedAt: (r.achieved_at as string | null) ?? null,
  };
}

/** 맞춤 운동 › 성장 탭 '내 목표'. */
export async function loadGoals(): Promise<GoalsView | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createSupabaseServerClient();
  const today = seoulYmd();
  const [{ data }, records, plan] = await Promise.all([
    supabase
      .from("lift_goals")
      .select("id, exercise_id, start_kg, target_kg, start_date, target_date, achieved_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    loadLiftRecords(user.id),
    resolvePlan(),
  ]);
  const name = (id: string) => getCatalogExercise(id)?.name ?? id;
  const goals = ((data ?? []) as Record<string, unknown>[]).map(rowToGoal).map((g) => ({
    ...g,
    name: name(g.exerciseId),
    progress: goalProgress(g, oneRMSeries(records, g.exerciseId), today),
  }));
  // 진행 중 먼저, 이룬 목표는 최근 2개만 아래에.
  const active = goals.filter((g) => !g.achievedAt);
  const done = goals.filter((g) => g.achievedAt).slice(0, 2);
  const taken = new Set(active.map((g) => g.exerciseId));
  const candidates = topExercisesByVolume(records, 8)
    .filter((t) => !taken.has(t.exerciseId))
    .map((t) => {
      const currentKg = Math.round(latestOneRm(oneRMSeries(records, t.exerciseId)) * 10) / 10;
      return { exerciseId: t.exerciseId, name: name(t.exerciseId), currentKg, suggestKg: suggestTargetKg(currentKg) };
    })
    .filter((c) => c.currentKg > 0);
  return {
    goals: [...active, ...done],
    active: active.length,
    limit: goalLimit(plan),
    full: plan !== "free",
    candidates,
    defaultDate: defaultTargetDate(today),
    today,
  };
}
