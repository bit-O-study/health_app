/**
 * 다짐 결과 데이터의 신뢰도(2026-10-06) — 순수 로직.
 *
 * 결과 테이블은 나중에 AI 학습 데이터가 된다. 그런데 실측·기록이 엉성한 행이 섞이면
 * 모델이 잡음을 배운다. 그래서 다짐마다 **얼마나 믿을 만한 데이터인지**를 같이 저장하고,
 * 학습에는 기준을 넘는 행만 쓴다.
 *
 * - 체중 실측: 측정 하루가 아니라 **7일 평균**(하루 수분 변동 ±1~2kg 을 줄인다).
 * - 식단 기록: 끼니 채움 비율, 사진 비율, '안 먹었어요' 비율, 기초대사보다 적게 먹은 걸로
 *   기록됐는지(덜 적은 기록 의심 — 사람들은 보통 20~40% 적게 기록한다).
 * - 근육: 인바디 오차(골격근 ±0.5~1kg)보다 변화가 커야 의미가 있다 → 시작·종료 인바디가
 *   모두 있고 60일 이상 떨어져 있을 때만 학습에 쓴다.
 */

export const WEIGHT_AVG_DAYS = 7;
/** 근육 실측을 학습에 쓰려면 시작·종료 인바디가 이만큼 떨어져 있어야 한다. */
export const MUSCLE_MIN_DAYS = 60;
/** 학습에 쓸 최소 점수. */
export const USABLE_SCORE = 60;

/** 체중 점들 → 평균(소수 1자리). 비면 null. */
export function averageWeight(points: number[]): number | null {
  const xs = points.filter((x) => Number.isFinite(x) && x > 0);
  if (xs.length === 0) return null;
  return Math.round((xs.reduce((s, v) => s + v, 0) / xs.length) * 10) / 10;
}

export type QualityInput = {
  /** 판정한 일수(실패면 실패 구간까지). */
  days: number;
  mealsPerDay: number | null;
  /** 끼니 수를 채운 날(식단 다짐이 없으면 한 끼라도 기록한 날). */
  mealDaysMet: number;
  /** 기록된 끼니 칸 수(날짜별 서로 다른 끼니의 합). */
  loggedMeals: number;
  /** 사진이 붙은 끼니 칸 수. */
  photoMeals: number;
  /** '안 먹었어요' 체크 수. */
  skippedMeals: number;
  /** 기록이 있는 날의 하루 평균 섭취. */
  avgIntakeKcal: number | null;
  bmr: number;
  /** 시작 직전 7일·마지막 7일 체중 기록 수. */
  startWeightPoints: number;
  endWeightPoints: number;
  /** 시작·종료 인바디 날짜(없으면 null). */
  inbodyStart: string | null;
  inbodyEnd: string | null;
};

export type DataQuality = {
  /** 0~100. */
  score: number;
  /** 끼니를 채운 날 비율(0~1). */
  mealCompleteness: number;
  /** 사진이 있는 끼니 비율(0~1). */
  photoShare: number;
  /** '안 먹었어요' 비율(0~1). */
  skipShare: number;
  /** 평균 섭취 ÷ 기초대사. */
  intakeVsBmr: number | null;
  /** 기초대사보다 적게 먹은 걸로 기록 — 덜 적은 기록이 의심된다. */
  underreportSuspected: boolean;
  /** 체중 실측을 믿을 만한가(시작·종료 모두 7일 평균 2점 이상). */
  weightReliable: boolean;
  /** 체중 변화를 학습에 쓸 수 있는가. */
  usableForWeight: boolean;
  /** 근육 변화를 학습에 쓸 수 있는가. */
  usableForMuscle: boolean;
  /** 사람이 읽는 이유. */
  flags: string[];
};

const r2 = (v: number) => Math.round(v * 100) / 100;

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

export function dataQuality(q: QualityInput): DataQuality {
  const flags: string[] = [];
  const mealCompleteness = q.days > 0 ? Math.min(1, q.mealDaysMet / q.days) : 0;
  const photoShare = q.loggedMeals > 0 ? Math.min(1, q.photoMeals / q.loggedMeals) : 0;
  const slots = q.loggedMeals + q.skippedMeals;
  const skipShare = slots > 0 ? q.skippedMeals / slots : 0;
  const intakeVsBmr = q.avgIntakeKcal !== null && q.bmr > 0 ? r2(q.avgIntakeKcal / q.bmr) : null;
  const underreportSuspected = intakeVsBmr !== null && intakeVsBmr < 1;
  const weightReliable = q.startWeightPoints >= 2 && q.endWeightPoints >= 2;

  if (mealCompleteness < 0.9) flags.push("끼니 기록이 빠진 날이 많아요");
  if (underreportSuspected) flags.push("기초대사보다 적게 기록됐어요(덜 적은 기록 의심)");
  if (skipShare > 0.3) flags.push("'안 먹었어요'가 많아요");
  if (!weightReliable) flags.push("시작·끝 7일 체중 기록이 2번 미만이에요");

  // 끼니 40 · 덜 적은 기록 아님 25 · 체중 7일 평균 20 · 사진 15.
  const score = Math.round(
    mealCompleteness * 40 +
      (intakeVsBmr === null ? 0 : underreportSuspected ? Math.max(0, intakeVsBmr - 0.6) * 62.5 : 25) +
      (Math.min(2, q.startWeightPoints) + Math.min(2, q.endWeightPoints)) * 5 +
      photoShare * 15,
  );

  let usableForMuscle = false;
  if (!q.inbodyStart || !q.inbodyEnd) {
    flags.push("시작·끝 인바디가 모두 있어야 근육 변화를 써요");
  } else if (daysBetween(q.inbodyStart, q.inbodyEnd) < MUSCLE_MIN_DAYS) {
    flags.push(`근육 변화는 인바디 오차보다 작아요(${MUSCLE_MIN_DAYS}일 이상 다짐부터 써요)`);
  } else {
    usableForMuscle = score >= USABLE_SCORE;
  }

  return {
    score,
    mealCompleteness: r2(mealCompleteness),
    photoShare: r2(photoShare),
    skipShare: r2(skipShare),
    intakeVsBmr,
    underreportSuspected,
    weightReliable,
    usableForWeight: weightReliable && score >= USABLE_SCORE,
    usableForMuscle,
    flags,
  };
}
