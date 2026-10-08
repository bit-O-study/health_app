import { DEFAULT_WEIGHT_KG } from "@/features/routine/default-weight";
import "server-only";

import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { seoulYmd } from "@/features/routine/data";
import { addDaysYmd } from "@/features/groups/ranking";
import { subMuscleWeightsForExercise } from "@/features/routine/muscle-detail";
import { BEGINNER_SKIP, EXERCISE_STIMULUS, stimulusFor, type Stimulus } from "@/features/routine/exercise-stimulus";
import { weeklyTargets, type BodyStyle } from "@/features/routine/body-targets";
import { fitPickCount, sessionCapacity, targetStyleFor } from "@/features/profile/survey-extra";
import {
  balanceRows,
  mostLacking,
  partRows,
  pickExercises,
  recoveringSubs,
  subRows,
  weeklyStimulus,
  withPlanned,
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
import { prescribe, type Prescription } from "@/features/routine/prescription";
import { isEquipmentId, type BodyPart } from "@/features/routine/exercise-catalog-labels";
import type { ProgressRecord } from "@/features/routine/progress";
import type { SetDetail } from "@/features/routine/set-details";
import {
  growthStories,
  insightsFrom,
  plateaus,
  restingParts,
  type GrowthStory,
  type Plateau,
  type RestingPart,
} from "@/features/routine/fit-insights";
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
  /** 모자란 곳 — **오늘 할 운동까지 더해서**(추천 화면용). */
  lacking: SubRow[];
  /** 오늘 할 운동 중 아직 안 끝낸 것 수(모자란 곳·추천 계산에 더한 것). */
  plannedCount: number;
  /** 오늘 운동이 1회 분량만큼 찼다(또는 오늘 추천을 이미 담았다) — 추천을 더 내밀지 않는다. */
  todayFull: boolean;
  /** 추천 + 처방(세트·횟수·무게, 오늘만 담을 때와 같은 값). */
  picks: (FitPick & { prescription: Prescription | null })[];
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
/** @param opts.n 추천 개수를 직접 정할 때(아픈 부위 대체 — 바꿀 운동 수만큼). 없으면 1회 운동 시간대로. */
export async function loadFitView(opts?: {
  n?: number;
  part?: BodyPart | null;
  /** 오늘 추천을 이미 담았는가(쿠키). 담았으면 '더 추천 받기' 전까지 추천을 숨긴다. */
  appliedToday?: boolean;
  /** '더 추천 받기' — 오늘이 차도 추천을 낸다. */
  more?: boolean;
}): Promise<FitView | null> {
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
  // 추천은 오늘 할 운동까지 더해서 — 담은 뒤 다시 들어와도 같은 곳을 또 채우라고 하지 않게.
  const doneToday = new Set(records.filter((r) => r.forDate === today && r.exerciseId).map((r) => r.exerciseId as string));
  const planned = withPlanned(stim, todayIds, doneToday, stimulusOf);
  const planRows = subRows(targets, planned.stim);

  // 후보: 손 점수가 있는 운동(검수된 점수) 중 내 헬스장에서 할 수 있고 아픈 부위가 아닌 것.
  const gymSet = toGymEquipmentSet(gym?.equipmentIds ?? null);
  const candidates: FitCandidate[] = [];
  for (const id of Object.keys(EXERCISE_STIMULUS)) {
    const ex = getCatalogExercise(id);
    if (!ex || !isExerciseAvailable(ex, gymSet)) continue;
    if (pain.includes(primaryBodyPart(id))) continue;
    // 균형 시트에서 '이 부위 채우는 운동 추천'으로 들어오면 그 부위 운동만.
    if (opts?.part && primaryBodyPart(id) !== opts.part) continue;
    if (profile?.experience === "beginner" && BEGINNER_SKIP.has(id)) continue;
    candidates.push({ exerciseId: id, name: ex.name, equipment: pickAvailableEquipment(ex, gymSet) });
  }
  const todayFull = !!opts?.appliedToday || planned.count >= sessionCapacity(profile?.sessionMinutes);
  // 오늘 추천 화면(appliedToday 를 넘긴 쪽)만 '오늘이 찼으면 숨김'을 쓴다 — 아픈 부위 대체 등 다른 호출은 그대로.
  const gate = opts?.appliedToday !== undefined && todayFull && !opts.more && !opts.part;
  const picks = gate ? [] : pickExercises(candidates, targets, planned.stim, stimulusOf, {
    // 1회 운동 시간에 맞춰 추천 개수(30분 2 · 45분 3 · 60분 4).
    n: opts?.n ?? fitPickCount(profile?.sessionMinutes),
    exclude: todayIds,
    recovering: recoveringSubs(records, stimulusOf, today, addDaysYmd(today, -1)),
  });

  return {
    style,
    experienceLabel: EXP_LABEL[profile?.experience ?? "intermediate"] ?? "중급",
    rows,
    parts: partRows(targets, stim),
    lacking: mostLacking(planRows, 3),
    plannedCount: planned.count,
    todayFull,
    picks: picks.map((p) => ({
      ...p,
      prescription: profile
        ? prescribe(p.exerciseId, {
            gender: profile.gender === "female" ? "female" : "male",
            experience: profile.experience,
            bodyType: profile.bodyType ?? "average",
            weightKg: profile.weightKg ?? DEFAULT_WEIGHT_KG,
            equipment: isEquipmentId(p.equipment) ? p.equipment : undefined,
          })
        : null,
    })),
    balance: balanceRows(targets, stim),
    daysThisWeek: new Set(records.map((r) => r.forDate)).size,
  };
}

export type FitGrowthView = {
  /** 기록으로 본 나(최근 120일) — 성장 기록 · 정체 · 쉬는 부위. 밀기:당기기는 7일 자극이라 화면에서. */
  insights: {
    stories: (GrowthStory & { name: string })[];
    plateaus: (Plateau & { name: string })[];
    resting: RestingPart[];
  };
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
 * 기록으로 본 나(성장 기록·정체·쉬는 부위)는 최근 120일을 본다 — 같은 쿼리로 길게 읽고 잘라 쓴다.
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
      .gte("for_date", insightsFrom(today) < `${last}-01` ? insightsFrom(today) : `${last}-01`)
      .lte("for_date", today),
    getUserProfile().catch(() => null),
  ]);
  const all: ProgressRecord[] = ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    forDate: String(r.for_date),
    exerciseId: (r.exercise_id as string | null) ?? null,
    status: "done",
    sets: r.sets == null ? null : Number(r.sets),
    reps: r.reps == null ? null : Number(r.reps),
    weightKg: r.weight_kg == null ? null : Number(r.weight_kg),
    setDetails: Array.isArray(r.set_details) ? (r.set_details as SetDetail[]) : null,
    equipment: (r.equipment as string | null) ?? null,
  }));
  // 성장·리포트(지난달~)는 예전 범위 그대로.
  const records = all.filter((r) => r.forDate >= `${last}-01`);
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
    insights: {
      stories: growthStories(all, today).map((g) => ({ ...g, name: name(g.exerciseId) })),
      plateaus: plateaus(all, today).map((p) => ({ ...p, name: name(p.exerciseId) })),
      resting: restingParts(all, primaryBodyPart, today),
    },
    growth: growthRows(records, 4).map((g) => ({ ...g, name: name(g.exerciseId), points: sparkPoints(g.series) })),
    prs: prs.map((p) => ({ ...p, name: name(p.exerciseId) })),
    month,
    thisMonth: monthStats(records, month, prs),
    lastMonth: monthStats(records, last, prs),
    topPart: parts.top,
    lackingPart: parts.lacking,
  };
}

/** 맞춤 운동 머리글(몸 목표·경력) — 성장·리포트 화면은 추천 계산 없이 이것만 읽는다. */
export async function loadFitHeaderInfo(): Promise<{ style: BodyStyle; experienceLabel: string }> {
  const profile = await getUserProfile().catch(() => null);
  return {
    style: targetStyleFor(profile?.bodyStyle, profile?.gender),
    experienceLabel: EXP_LABEL[profile?.experience ?? "intermediate"] ?? "중급",
  };
}
