import "server-only";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import {
  strengthKcalForCompletion,
  estimateConditioningKcal,
} from "@/features/routine/calories";
import { conditioningDefaults } from "@/features/routine/conditioning-catalog";
import { seoulYmd } from "@/features/routine/data";
import {
  commitmentProgress,
  isCommitmentMetric,
  metricMeta,
  type CommitmentAgg,
  type CommitmentMetric,
  type CommitmentProgress,
} from "@/features/commitments/commitment";

const num = (v: number | string | null | undefined): number => {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export type CommitmentRow = {
  id: string;
  title: string;
  tag: string;
  metric: CommitmentMetric;
  target: number;
  startDate: string;
  deadline: string;
};

export type CommitmentView = CommitmentRow & {
  progress: CommitmentProgress;
  metricLabel: string;
  unit: string;
  kind: "workout" | "diet";
};

type ExRow = { for_date: string; exercise_id: string | null; sets: number | null };
type CondRow = {
  for_date: string;
  item_id: string | null;
  duration_min: number | null;
  speed: number | string | null;
};
type FoodRow = { for_date: string; kcal: number | string };

/** 한 다짐의 [start, min(deadline, today)] 창에 대해 기존 기록을 집계. */
function aggregateWindow(
  from: string,
  toInclusive: string,
  weight: number,
  ex: ExRow[],
  cond: CondRow[],
  food: FoodRow[],
): CommitmentAgg {
  const inWin = (d: string) => d >= from && d <= toInclusive;
  const workoutDates = new Set<string>();
  let workoutCount = 0;
  let burnKcal = 0;
  for (const r of ex) {
    if (!r.exercise_id || !inWin(r.for_date)) continue;
    burnKcal += strengthKcalForCompletion(weight, r.exercise_id, num(r.sets));
    workoutCount += 1;
    workoutDates.add(r.for_date);
  }
  for (const r of cond) {
    if (!r.item_id || !inWin(r.for_date)) continue;
    const d = conditioningDefaults(r.item_id);
    burnKcal += estimateConditioningKcal(
      weight,
      r.item_id,
      r.duration_min ?? d.durationMin,
      r.speed === null ? d.speed : num(r.speed),
    );
    workoutCount += 1;
    workoutDates.add(r.for_date);
  }
  const intakeByDay = new Map<string, number>();
  for (const r of food) {
    if (!inWin(r.for_date)) continue;
    intakeByDay.set(r.for_date, (intakeByDay.get(r.for_date) ?? 0) + num(r.kcal));
  }
  const intakeDays = intakeByDay.size;
  const intakeSum = [...intakeByDay.values()].reduce((s, v) => s + v, 0);
  return {
    workoutDays: workoutDates.size,
    workoutCount,
    burnKcal,
    dietDays: intakeDays,
    intakeAvg: intakeDays > 0 ? intakeSum / intakeDays : 0,
    intakeDays,
  };
}

/** 내 다짐 목록 + 자동 진행률(기존 운동/식단 기록 집계). */
export async function getMyCommitments(): Promise<CommitmentView[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createSupabaseServerClient();

  const { data: rows } = await supabase
    .from("commitments")
    .select("id, title, tag, metric, target, start_date, deadline")
    .eq("user_id", user.id)
    .eq("archived", false)
    .order("deadline", { ascending: true });

  const commitments = ((rows ?? []) as {
    id: string;
    title: string;
    tag: string;
    metric: string;
    target: number | string;
    start_date: string;
    deadline: string;
  }[]).filter((c) => isCommitmentMetric(c.metric));
  if (commitments.length === 0) return [];

  const today = seoulYmd();
  const minStart = commitments.reduce(
    (min, c) => (c.start_date < min ? c.start_date : min),
    commitments[0].start_date,
  );

  const [{ data: profile }, { data: exRows }, { data: condRows }, { data: foodRows }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("weight_kg")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("exercise_completions")
        .select("for_date, exercise_id, sets")
        .eq("user_id", user.id)
        .eq("status", "done")
        .gte("for_date", minStart)
        .lte("for_date", today),
      supabase
        .from("conditioning_completions")
        .select("for_date, item_id, duration_min, speed")
        .eq("user_id", user.id)
        .eq("status", "done")
        .gte("for_date", minStart)
        .lte("for_date", today),
      supabase
        .from("food_logs")
        .select("for_date, kcal")
        .eq("user_id", user.id)
        .gte("for_date", minStart)
        .lte("for_date", today),
    ]);

  const weight = num((profile as { weight_kg?: number | string | null } | null)?.weight_kg) || 65;
  const ex = (exRows ?? []) as ExRow[];
  const cond = (condRows ?? []) as CondRow[];
  const food = (foodRows ?? []) as FoodRow[];

  return commitments.map((c) => {
    const metric = c.metric as CommitmentMetric;
    const target = num(c.target);
    const winTo = c.deadline < today ? c.deadline : today; // 데드라인 넘겼으면 그때까지만
    const agg = aggregateWindow(c.start_date, winTo, weight, ex, cond, food);
    const meta = metricMeta(metric);
    return {
      id: c.id,
      title: c.title,
      tag: c.tag,
      metric,
      target,
      startDate: c.start_date,
      deadline: c.deadline,
      progress: commitmentProgress(
        { metric, target, startDate: c.start_date, deadline: c.deadline },
        agg,
        today,
      ),
      metricLabel: meta.label,
      unit: meta.unit,
      kind: meta.kind,
    };
  });
}

/** 캘린더 표시용 — 활성/예정 다짐의 기간(경량, 진행률 계산 없음). */
export async function getCommitmentBands(): Promise<
  { id: string; title: string; startDate: string; deadline: string; kind: "workout" | "diet" }[]
> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("commitments")
    .select("id, title, metric, start_date, deadline")
    .eq("user_id", user.id)
    .eq("archived", false)
    .order("deadline", { ascending: true });
  return ((data ?? []) as {
    id: string;
    title: string;
    metric: string;
    start_date: string;
    deadline: string;
  }[])
    .filter((c) => isCommitmentMetric(c.metric))
    .map((c) => ({
      id: c.id,
      title: c.title,
      startDate: c.start_date,
      deadline: c.deadline,
      kind: metricMeta(c.metric as CommitmentMetric).kind,
    }));
}
