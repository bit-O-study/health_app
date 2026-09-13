/**
 * 완료 기록 → "이번 주 훈련" 카드가 그릴 값들.
 *
 * 내 점수 화면과 트레이너의 회원 화면이 **같은 판정**을 봐야 하므로 한 곳에서 만든다.
 * (두 화면이 각자 계산하면 트레이너와 회원이 다른 숫자를 보고 이야기하게 된다.)
 *
 * 카탈로그(`subMusclesForExercise`)가 필요해 **서버에서만** 부른다 — 결과는 숫자뿐이라
 * 클라이언트로 그대로 내려보내도 목록이 따라가지 않는다.
 */

import { REGION_LIST, type Region } from "@/features/routine/score";
import { STALL_SESSIONS, overloadPlan } from "@/features/routine/overload";
import type { ProgressRecord } from "@/features/routine/progress";
import { getCatalogExercise } from "@/features/routine/exercise-catalog";
import type { ExperienceLevel } from "@/features/profile/data";
import {
  subMuscleWeightsForExercise,
  subMusclesForExercise,
} from "@/features/routine/muscle-detail";
import { ALL_SUB_MUSCLES, PRIMARY_WEIGHT } from "@/features/routine/sub-muscles";
import { muscleGroup, type MuscleId } from "@/features/routine/muscle-map";
import {
  daysAgo,
  lastTrainedByRegion,
  pushPullBalance,
  isCrammed,
  regionOfSubMuscle,
  setsByRegion,
  setsBySubMuscle,
  setsDelta,
  trainingDaysByRegion,
  upperLowerBalance,
  volumeStatusFor,
  weekHeatmap,
  weekStartOf,
  addDays,
  type Balance,
  type SetRecord,
} from "@/features/routine/training-volume";
import type {
  WeeklyHeatCell,
  WeeklyRegionRow,
} from "@/features/routine/components/weekly-training-card";

export const REGION_LABEL_KO: Record<Region, string> = {
  chest: "가슴",
  back: "등",
  shoulder: "어깨",
  arm: "팔",
  leg: "하체",
  core: "코어",
};

/** 부위 → 색(마네킹·부위 칩과 같은 색을 쓴다). `leg` 만 MuscleId 이름이 다르다. */
function regionColor(r: Region): string {
  const id = (r === "leg" ? "lower" : r) as MuscleId;
  return muscleGroup(id).color;
}

/**
 * 정체 중인 종목 — **무게가 안 오르는 곳**.
 *
 * 왜 주간 분석에 끌어오나: `overload.ts` 가 정체를 이미 판정하는데 그 결과가 성장
 * 그래프에만 있었다. "삼두를 직접 노린 적 없음"(이 카드)과 "벤치프레스 3주째 정체"
 * (저쪽 화면)는 **같은 원인일 수 있는데** 두 화면에 흩어져 있으면 아무도 잇지 못한다.
 */
export type StalledExercise = {
  exerciseId: string;
  name: string;
  region: Region;
  regionLabel: string;
  /** 최고치가 안 늘어난 연속 세션 수. */
  sessions: number;
  /** 화면에 그대로 쓸 근거 한 줄(성장 그래프와 같은 문구). */
  reason: string;
};

export type WeeklyTrainingView = {
  weekStart: string;
  todayYmd: string;
  cells: WeeklyHeatCell[];
  regions: WeeklyRegionRow[];
  pushPull: Balance;
  upperLower: Balance;
  /** 이번 주 **주동근으로도 협응으로도** 안 나온 세부근육. */
  untouchedSubs: { id: string; label: string }[];
  /** 거들기만 하고 **주동근으로는 안 노린** 세부근육 — 있는 줄 알았는데 없는 자리다. */
  synergistOnlySubs: { id: string; label: string }[];
  /** 이번 주 총 직접 세트. 0이면 화면이 "아직 기록 없음"으로 갈 수 있다. */
  weekSets: number;
  /** 정체 중인 종목. 경력을 안 넘기면 빈 배열(판정 기준이 경력에 달려 있다). */
  stalled: StalledExercise[];
};

/** 주간 분석 입력 — 세트 판정에 더해 정체 판정용 무게·횟수까지. */
export type WeeklyRecord = SetRecord & {
  reps?: number | null;
  weightKg?: number | null;
  equipment?: string | null;
};

export function buildWeeklyTrainingView(
  records: readonly WeeklyRecord[],
  todayYmd: string,
  /** 목표 횟수가 경력에 따라 달라진다 — 없으면 정체 판정을 건너뛴다. */
  experience?: ExperienceLevel,
): WeeklyTrainingView {
  const subsOf = (id: string) => subMusclesForExercise(id).map((s) => s.id);
  const weekStart = weekStartOf(todayYmd);
  const weekEnd = addDays(weekStart, 6);

  const days = weekHeatmap(records, subsOf, weekStart);
  const cells: WeeklyHeatCell[] = days.map((d) => {
    // 그 날 가장 많이 한 부위 하나로 칸을 칠한다 — 여섯 부위를 한 칸에 다 넣으면
    // 칸이 너무 작아 아무것도 안 읽힌다. 정확한 내역은 title(툴팁)에 있다.
    let top: Region | null = null;
    for (const r of REGION_LIST) {
      if (d.byRegion[r] > 0 && (top === null || d.byRegion[r] > d.byRegion[top])) {
        top = r;
      }
    }
    return {
      ymd: d.ymd,
      weekday: d.weekday,
      total: d.total,
      topLabel: top ? REGION_LABEL_KO[top] : null,
      topColor: top ? regionColor(top) : null,
    };
  });

  const weekRegionSets = setsByRegion(records, subsOf, weekStart, weekEnd);
  const weekRegionDays = trainingDaysByRegion(records, subsOf, weekStart, weekEnd);
  // 지난주는 **같은 함수를 범위만 바꿔** 돌린다 — 비교하는 두 값이 다른 방식으로
  // 계산되면 그 차이가 내 훈련의 변화인지 계산의 차이인지 알 수 없다.
  const prevStart = addDays(weekStart, -7);
  const prevRegionSets = setsByRegion(
    records,
    subsOf,
    prevStart,
    addDays(prevStart, 6),
  );
  // 마지막 운동일은 **이번 주로 자르지 않는다** — "등 11일째 안 함"을 말하려면
  // 이번 주 밖까지 봐야 한다(이번 주만 보면 전부 "기록 없음"이 된다).
  const lastTrained = lastTrainedByRegion(records, subsOf);

  const regions: WeeklyRegionRow[] = REGION_LIST.map((r) => ({
    region: r,
    label: REGION_LABEL_KO[r],
    sets: weekRegionSets[r],
    status: volumeStatusFor(weekRegionSets[r]),
    days: weekRegionDays[r],
    crammed: isCrammed(weekRegionSets[r], weekRegionDays[r]),
    prevSets: prevRegionSets[r],
    delta: setsDelta(weekRegionSets[r], prevRegionSets[r]),
    lastYmd: lastTrained[r],
    daysAgo: daysAgo(lastTrained[r], todayYmd),
  }));

  // 🔴 두 번 센다. 벤치프레스의 매핑은 [중부, 하부] 인데 둘을 똑같이 세면 벤치프레스만
  //    해도 **하부 대흉근을 "했다"** 로 나온다. 실제로는 거들 뿐이라, "하부를 노린 운동이
  //    있었나" 에는 아니다. 기여도로 갈라서 '아예 안 함' 과 '거들기만 함' 을 나눈다.
  const subWeightsOf = (id: string) =>
    subMuscleWeightsForExercise(id).map((w) => ({
      id: w.sub.id,
      weight: w.weight,
    }));
  const anySets = setsBySubMuscle(records, subWeightsOf, weekStart, weekEnd);
  const primarySets = setsBySubMuscle(
    records,
    subWeightsOf,
    weekStart,
    weekEnd,
    PRIMARY_WEIGHT,
  );
  const untouchedSubs = ALL_SUB_MUSCLES.filter(
    (s) => (anySets[s.id] ?? 0) === 0,
  ).map((s) => ({ id: s.id, label: s.label }));
  const synergistOnlySubs = ALL_SUB_MUSCLES.filter(
    (s) => (anySets[s.id] ?? 0) > 0 && (primarySets[s.id] ?? 0) === 0,
  ).map((s) => ({ id: s.id, label: s.label }));

  return {
    weekStart,
    todayYmd,
    cells,
    regions,
    pushPull: pushPullBalance(weekRegionSets),
    upperLower: upperLowerBalance(weekRegionSets),
    untouchedSubs,
    synergistOnlySubs,
    weekSets: REGION_LIST.reduce((sum, r) => sum + weekRegionSets[r], 0),
    stalled: experience ? stalledExercises(records, experience, subsOf) : [],
  };
}

/**
 * 무게가 안 오르는 종목들 — 최근에 실제로 한 것만.
 *
 * 🔴 **오래 안 한 종목은 정체가 아니다.** 반년 전에 그만둔 운동을 "3주째 정체"라고
 * 띄우면 지금 할 일과 상관없는 경고가 쌓인다. 최근 4주 안에 한 것만 본다.
 */
const STALL_LOOKBACK_DAYS = 28;

function stalledExercises(
  records: readonly WeeklyRecord[],
  experience: ExperienceLevel,
  subsOf: (id: string) => string[],
): StalledExercise[] {
  const progress: ProgressRecord[] = records.map((r) => ({
    forDate: r.forDate,
    exerciseId: r.exerciseId ?? null,
    status: "done",
    sets: r.sets ?? null,
    reps: r.reps ?? null,
    weightKg: r.weightKg ?? null,
    setDetails: r.setDetails ?? null,
    equipment: r.equipment ?? null,
  }));

  const cutoff = addDays(
    records.reduce((max, r) => (r.forDate > max ? r.forDate : max), ""),
    0,
  );
  const recent = new Set(
    records
      .filter((r) => r.exerciseId && r.forDate >= addDays(cutoff, -STALL_LOOKBACK_DAYS))
      .map((r) => r.exerciseId as string),
  );

  const out: StalledExercise[] = [];
  for (const exerciseId of recent) {
    const plan = overloadPlan(progress, exerciseId, experience);
    if (plan.stalledSessions < STALL_SESSIONS) continue;
    const region = regionOfExercise(exerciseId, subsOf);
    if (!region) continue;
    out.push({
      exerciseId,
      name: getCatalogExercise(exerciseId)?.name ?? exerciseId,
      region,
      regionLabel: REGION_LABEL_KO[region],
      sessions: plan.stalledSessions,
      reason: plan.reason,
    });
  }
  // 오래 막힌 것부터. 같으면 이름순 — 순서가 흔들리면 매번 다른 게 위에 온다.
  return out.sort(
    (a, b) => b.sessions - a.sessions || a.name.localeCompare(b.name, "ko"),
  );
}

/** 운동 → 부위(주동근 기준). 세트 판정과 같은 규칙을 쓴다. */
function regionOfExercise(
  exerciseId: string,
  subsOf: (id: string) => string[],
): Region | null {
  for (const sub of subsOf(exerciseId)) {
    const reg = regionOfSubMuscle(sub);
    if (reg) return reg;
  }
  return null;
}
