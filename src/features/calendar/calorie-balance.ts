/**
 * 캘린더 칼로리 수지 — 순수 로직.
 *
 * 예전 카드는 "운동 소비 − 먹은 양" 이었다. 기초대사량(가만히 있어도 쓰는 1,400~1,800kcal)을
 * 빼 놓아서, 하루 2,000kcal 먹고 300kcal 운동한 사람이 −1,700 "적자" 로 나왔다
 * — 거의 모든 사용자가 늘 적자였다(2026-09-29 캘린더 검수보고서).
 *
 * 이제는 **식단을 기록한 날만** 센다. 그날 수지 = 먹은 양 − (기초대사량 + 운동 + 걷기).
 * 식단을 안 적은 날까지 넣으면 먹은 게 0 으로 잡혀 빠지는 쪽으로 크게 기운다.
 *
 * 부호는 몸 기준이다: **음수 = 쓴 게 더 많다 = 살 빠지는 쪽**, 양수 = 찌는 쪽.
 * "흑자/적자" 는 사람마다 반대로 읽어서(예전 카드는 소비가 많으면 '흑자') 쓰지 않는다.
 */

export type DayCalories = {
  /** 먹은 kcal. */
  intake: number;
  /** 운동(근력·유산소) kcal. */
  exerciseKcal: number;
  /** 걸음수 kcal. */
  stepsKcal: number;
};

export type CalorieDirection = "loss" | "gain" | "even";

export type CalorieBalance = {
  /** 먹은 양 − 쓴 양(식단 기록한 날 합). 음수면 빠지는 쪽. */
  netKcal: number;
  direction: CalorieDirection;
  /** 합산에 들어간 날 수(식단을 기록한 날). 0 이면 판단할 수 없다. */
  loggedDays: number;
  /** 그 날들의 먹은 양·기초대사량·운동·걷기 합 — 근거 한 줄에 쓴다. */
  intakeKcal: number;
  bmrKcal: number;
  exerciseKcal: number;
  stepsKcal: number;
};

/** ±이 안쪽이면 "균형" — 하루 100kcal 은 측정 오차 수준이다. */
export const EVEN_BAND_PER_DAY = 100;

export function calorieBalance(
  days: Iterable<DayCalories>,
  bmrPerDay: number,
): CalorieBalance {
  const bmr = Number.isFinite(bmrPerDay) && bmrPerDay > 0 ? bmrPerDay : 0;
  let loggedDays = 0;
  let intakeKcal = 0;
  let exerciseKcal = 0;
  let stepsKcal = 0;
  for (const d of days) {
    if (!(d.intake > 0)) continue;
    loggedDays += 1;
    intakeKcal += d.intake;
    exerciseKcal += Math.max(0, d.exerciseKcal);
    stepsKcal += Math.max(0, d.stepsKcal);
  }
  const bmrKcal = Math.round(bmr * loggedDays);
  const netKcal = Math.round(intakeKcal - (bmrKcal + exerciseKcal + stepsKcal));
  const band = EVEN_BAND_PER_DAY * loggedDays;
  const direction: CalorieDirection =
    loggedDays === 0 || Math.abs(netKcal) <= band
      ? "even"
      : netKcal < 0
        ? "loss"
        : "gain";
  return {
    netKcal,
    direction,
    loggedDays,
    intakeKcal: Math.round(intakeKcal),
    bmrKcal,
    exerciseKcal: Math.round(exerciseKcal),
    stepsKcal: Math.round(stepsKcal),
  };
}

/** 카드 제목 옆 말 — "살 빠지는 쪽" 처럼 부호를 풀어 준다. */
export function directionLabel(b: CalorieBalance): string {
  if (b.loggedDays === 0) return "식단 기록 없음";
  return b.direction === "loss"
    ? "살 빠지는 쪽"
    : b.direction === "gain"
      ? "살 찌는 쪽"
      : "균형";
}

/** "−2,400" / "+350" / "0" — 부호를 항상 붙인다(빠지는 쪽이 음수). */
export function signedKcal(n: number): string {
  if (n === 0) return "0";
  return `${n < 0 ? "−" : "+"}${Math.abs(n).toLocaleString("ko-KR")}`;
}

/**
 * 달력 한 칸을 화면 읽기 프로그램이 읽을 문장.
 * 예) "9월 25일 목요일, 오늘, 추석, 먹은 900kcal, 움직인 180kcal, 근력운동, 다짐 67%"
 */
export function dayAriaLabel(o: {
  date: string;
  isToday: boolean;
  holiday?: string | null;
  intake: number;
  burned: number;
  didWeight: boolean;
  missionPct?: number | null;
  period?: "period" | "predicted" | null;
}): string {
  const [y, m, d] = o.date.split("-").map(Number);
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  const parts = [`${m}월 ${d}일 ${weekday}요일`];
  if (o.isToday) parts.push("오늘");
  if (o.holiday) parts.push(o.holiday);
  if (o.intake > 0) parts.push(`먹은 ${o.intake.toLocaleString("ko-KR")}kcal`);
  if (o.burned > 0) parts.push(`움직인 ${o.burned.toLocaleString("ko-KR")}kcal`);
  if (o.didWeight) parts.push("근력운동");
  if (typeof o.missionPct === "number") parts.push(`다짐 ${o.missionPct}%`);
  if (o.period === "period") parts.push("생리");
  else if (o.period === "predicted") parts.push("생리 예정");
  return parts.join(", ");
}
