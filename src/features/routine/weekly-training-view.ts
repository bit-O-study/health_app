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
  setsByRegion,
  setsBySubMuscle,
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
};

export function buildWeeklyTrainingView(
  records: readonly SetRecord[],
  todayYmd: string,
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
  // 마지막 운동일은 **이번 주로 자르지 않는다** — "등 11일째 안 함"을 말하려면
  // 이번 주 밖까지 봐야 한다(이번 주만 보면 전부 "기록 없음"이 된다).
  const lastTrained = lastTrainedByRegion(records, subsOf);

  const regions: WeeklyRegionRow[] = REGION_LIST.map((r) => ({
    region: r,
    label: REGION_LABEL_KO[r],
    sets: weekRegionSets[r],
    status: volumeStatusFor(weekRegionSets[r]),
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
  };
}
