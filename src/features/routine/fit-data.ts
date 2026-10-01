import "server-only";

import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { seoulYmd } from "@/features/routine/data";
import { addDaysYmd } from "@/features/groups/ranking";
import { subMuscleWeightsForExercise } from "@/features/routine/muscle-detail";
import { BEGINNER_SKIP, EXERCISE_STIMULUS, stimulusFor, type Stimulus } from "@/features/routine/exercise-stimulus";
import { weeklyTargets, type BodyStyle } from "@/features/routine/body-targets";
import { fitPickCount, targetStyleFor } from "@/features/profile/survey-extra";
import {
  balanceRows,
  mostLacking,
  partRows,
  pickExercises,
  recoveringSubs,
  subRows,
  weeklyStimulus,
  type BalanceRow,
  type FitCandidate,
  type FitPick,
  type FitRecord,
  type SubRow,
} from "@/features/routine/fit";
import { getCatalogExercise } from "@/features/routine/exercise-catalog";
import { primaryBodyPart } from "@/features/routine/exercise-body-parts";
import { getCurrentGym } from "@/features/gym/gym-data-access";
import { isExerciseAvailable, pickAvailableEquipment, toGymEquipmentSet } from "@/features/gym/gym-equipment-mapping";
import { getPainAreas } from "@/features/routine/checkin-data";
import { todayExerciseIds } from "@/features/routine/today-exercise-ids";
import { getUserProfile } from "@/features/profile/data-access";
import type { ProgressRecord } from "@/features/routine/progress";
import type { SetDetail } from "@/features/routine/set-details";
import {
  growthRows,
  monthParts,
  monthStats,
  prEvents,
  prevMonth,
  sparkPoints,
  type GrowthRow,
  type MonthStats,
  type PrEvent,
} from "@/features/routine/fit-growth";

/** 운동 → 세부 근육 점수(손 점수, 없으면 기존 매핑 + 보조근 규칙). 요청 안에서만 캐시. */
export function makeStimulusOf(): (id: string) => Stimulus {
  const cache = new Map<string, Stimulus>();
  return (id) => {
    let s = cache.get(id);
    if (!s) {
      s = stimulusFor(
        id,
        subMuscleWeightsForExercise(id).map((w) => ({ id: w.sub.id, weight: w.weight })),
      );
      cache.set(id, s);
    }
    return s;
  };
}

export type FitView = {
  style: BodyStyle;
  experienceLabel: string;
  rows: SubRow[];
  parts: ReturnType<typeof partRows>;
  lacking: SubRow[];
  picks: FitPick[];
  balance: BalanceRow[];
  /** 지난 7일 운동한 날. 0 이면 설문(성별·경력) 목표만으로 추천한다. */
  daysThisWeek: number;
};

const EXP_LABEL: Record<string, string> = { beginner: "초급", intermediate: "중급", advanced: "상급" };

/**
 * 맞춤 운동 화면 데이터 — 지난 7일 기록 + 가입 설문(성별·경력) + 헬스장 기구 + 아픈 부위.
 *
 * 기록이 없으면 이번 주 자극이 전부 0이라 목표가 곧 모자람이다 → 설문 목표대로 추천된다
 * (가입 직후 · `docs/sub-muscle-score-lite-plan-2026-10-01.html` 2-2).
 */
export async function loadFitView(): Promise<FitView | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createSupabaseServerClient();
  const today = seoulYmd();
  const from = addDaysYmd(today, -6);
  const [profile, recs, gym, pain, todayIds] = await Promise.all([
    getUserProfile().catch(() => null),
    supabase
      .from("exercise_completions")
      .select("exercise_id, for_date, sets, set_details")
      .eq("user_id", user.id)
      .eq("status", "done")
      .gte("for_date", from)
      .lte("for_date", today),
    getCurrentGym().catch(() => null),
    getPainAreas(),
    todayExerciseIds(),
  ]);

  const records: FitRecord[] = ((recs.data ?? []) as {
    exercise_id: string | null;
    for_date: string;
    sets: number | null;
    set_details: unknown;
  }[]).map((r) => ({
    exerciseId: r.exercise_id,
    forDate: r.for_date,
    sets: Array.isArray(r.set_details) && r.set_details.length > 0 ? r.set_details.length : Number(r.sets) || 0,
  }));

  const stimulusOf = makeStimulusOf();
  // 몸 목표 스타일(설정·가입 설문) — 안 골랐으면 성별 표.
  const style = targetStyleFor(profile?.bodyStyle, profile?.gender);
  const targets = weeklyTargets(style, profile?.experience);
  const stim = weeklyStimulus(records, stimulusOf);
  const rows = subRows(targets, stim);

  // 후보: 손 점수가 있는 운동(검수된 점수) 중 내 헬스장에서 할 수 있고 아픈 부위가 아닌 것.
  const gymSet = toGymEquipmentSet(gym?.equipmentIds ?? null);
  const candidates: FitCandidate[] = [];
  for (const id of Object.keys(EXERCISE_STIMULUS)) {
    const ex = getCatalogExercise(id);
    if (!ex || !isExerciseAvailable(ex, gymSet)) continue;
    if (pain.includes(primaryBodyPart(id))) continue;
    if (profile?.experience === "beginner" && BEGINNER_SKIP.has(id)) continue;
    candidates.push({ exerciseId: id, name: ex.name, equipment: pickAvailableEquipment(ex, gymSet) });
  }
  const picks = pickExercises(candidates, targets, stim, stimulusOf, {
    // 1회 운동 시간에 맞춰 추천 개수(30분 2 · 45분 3 · 60분 4).
    n: fitPickCount(profile?.sessionMinutes),
    exclude: todayIds,
    recovering: recoveringSubs(records, stimulusOf, today, addDaysYmd(today, -1)),
  });

  return {
    style,
    experienceLabel: EXP_LABEL[profile?.experience ?? "intermediate"] ?? "중급",
    rows,
    parts: partRows(targets, stim),
    lacking: mostLacking(rows, 3),
    picks,
    balance: balanceRows(targets, stim),
    daysThisWeek: new Set(records.map((r) => r.forDate)).size,
  };
}

export type FitGrowthView = {
  growth: (GrowthRow & { name: string; points: string })[];
  prs: (PrEvent & { name: string })[];
  month: string;
  thisMonth: MonthStats;
  lastMonth: MonthStats;
  topPart: string | null;
  lackingPart: string | null;
};

/**
 * 성장·월간 리포트 — 지난달 1일부터 오늘까지 기록. 무게 있는 기록만 1RM 에 쓰인다.
 */
export async function loadFitGrowth(): Promise<FitGrowthView | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createSupabaseServerClient();
  const today = seoulYmd();
  const month = today.slice(0, 7);
  const last = prevMonth(month);
  const [{ data }, profile] = await Promise.all([
    supabase
      .from("exercise_completions")
      .select("exercise_id, for_date, sets, reps, weight_kg, set_details, equipment")
      .eq("user_id", user.id)
      .eq("status", "done")
      .gte("for_date", `${last}-01`)
      .lte("for_date", today),
    getUserProfile().catch(() => null),
  ]);
  const records: ProgressRecord[] = ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    forDate: String(r.for_date),
    exerciseId: (r.exercise_id as string | null) ?? null,
    status: "done",
    sets: r.sets == null ? null : Number(r.sets),
    reps: r.reps == null ? null : Number(r.reps),
    weightKg: r.weight_kg == null ? null : Number(r.weight_kg),
    setDetails: Array.isArray(r.set_details) ? (r.set_details as SetDetail[]) : null,
    equipment: (r.equipment as string | null) ?? null,
  }));
  const name = (id: string) => getCatalogExercise(id)?.name ?? id;
  const prs = prEvents(records, 5);
  const day = Number(today.slice(8, 10));
  const parts = monthParts(
    records,
    month,
    weeklyTargets(targetStyleFor(profile?.bodyStyle, profile?.gender), profile?.experience),
    Math.ceil(day / 7),
    makeStimulusOf(),
  );
  return {
    growth: growthRows(records, 4).map((g) => ({ ...g, name: name(g.exerciseId), points: sparkPoints(g.series) })),
    prs: prs.map((p) => ({ ...p, name: name(p.exerciseId) })),
    month,
    thisMonth: monthStats(records, month, prs),
    lastMonth: monthStats(records, last, prs),
    topPart: parts.top,
    lackingPart: parts.lacking,
  };
}
