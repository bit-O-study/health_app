/** 다짐(commitment) — 순수 로직(지표 메타·프리셋·진행률). 테스트 가능. */

export type CommitmentMetric =
  | "workout_days"
  | "workout_count"
  | "burn_kcal"
  | "diet_days"
  | "intake_avg_max";

/** 지표 방향 — atleast: 이상 달성, atmost: 이하 달성(적을수록 좋음). */
export type MetricDir = "atleast" | "atmost";

export const COMMITMENT_METRICS: {
  id: CommitmentMetric;
  label: string;
  unit: string;
  dir: MetricDir;
  /** 운동/식단 어느 쪽 지표인지(그룹핑·아이콘용). */
  kind: "workout" | "diet";
}[] = [
  { id: "workout_days", label: "운동한 날", unit: "일", dir: "atleast", kind: "workout" },
  { id: "workout_count", label: "운동 횟수", unit: "회", dir: "atleast", kind: "workout" },
  { id: "burn_kcal", label: "소비 칼로리", unit: "kcal", dir: "atleast", kind: "workout" },
  { id: "diet_days", label: "식단 기록한 날", unit: "일", dir: "atleast", kind: "diet" },
  { id: "intake_avg_max", label: "하루 평균 섭취(이하)", unit: "kcal", dir: "atmost", kind: "diet" },
];

export function isCommitmentMetric(v: unknown): v is CommitmentMetric {
  return COMMITMENT_METRICS.some((m) => m.id === v);
}

export function metricMeta(metric: CommitmentMetric) {
  return COMMITMENT_METRICS.find((m) => m.id === metric)!;
}

/** 태그 체크 방식 빠른 추가용 프리셋(선택 시 아래 값으로 채워 편집 가능). */
export const COMMITMENT_PRESETS: {
  tag: string;
  title: string;
  metric: CommitmentMetric;
  target: number;
}[] = [
  { tag: "consistent", title: "꾸준히 운동하기", metric: "workout_days", target: 12 },
  { tag: "burn", title: "칼로리 많이 태우기", metric: "burn_kcal", target: 5000 },
  { tag: "frequent", title: "운동 자주 하기", metric: "workout_count", target: 16 },
  { tag: "diet-log", title: "식단 기록 습관", metric: "diet_days", target: 20 },
  { tag: "no-overeat", title: "과식 안 하기", metric: "intake_avg_max", target: 2000 },
];

/** 기간 내 기존 운동/식단 기록에서 뽑아온 집계값. */
export type CommitmentAgg = {
  workoutDays: number;
  workoutCount: number;
  burnKcal: number;
  dietDays: number;
  /** 식단 기록이 있는 날의 하루 평균 섭취 kcal. */
  intakeAvg: number;
  /** 식단 기록이 있는 날 수(평균 유효성 판단용). */
  intakeDays: number;
};

const pad = (n: number) => String(n).padStart(2, "0");
/** ymd(a) → ymd(b) 사이 일수(b-a). 같은 날=0, 미래=양수. */
export function ymdDiff(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round(
    (Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000,
  );
}

export type CommitmentProgress = {
  current: number;
  target: number;
  pct: number;
  done: boolean;
  /** 데드라인까지 남은 일수(오늘 포함, 지났으면 0). */
  daysLeft: number;
  /** 데드라인 경과 여부. */
  expired: boolean;
  /** 아직 시작 전. */
  upcoming: boolean;
};

function pickCurrent(metric: CommitmentMetric, agg: CommitmentAgg): number {
  switch (metric) {
    case "workout_days":
      return agg.workoutDays;
    case "workout_count":
      return agg.workoutCount;
    case "burn_kcal":
      return Math.round(agg.burnKcal);
    case "diet_days":
      return agg.dietDays;
    case "intake_avg_max":
      return Math.round(agg.intakeAvg);
  }
}

/** 다짐 진행률 — 기간 집계 + 목표로 달성/진행률/남은일수 계산. */
export function commitmentProgress(
  c: {
    metric: CommitmentMetric;
    target: number;
    startDate: string;
    deadline: string;
  },
  agg: CommitmentAgg,
  today: string,
): CommitmentProgress {
  const meta = metricMeta(c.metric);
  const current = pickCurrent(c.metric, agg);
  const pct =
    c.target > 0 ? Math.min(100, Math.round((current / c.target) * 100)) : 0;

  const done =
    meta.dir === "atleast"
      ? current >= c.target
      : agg.intakeDays > 0 && current <= c.target;

  const toDeadline = ymdDiff(today, c.deadline); // 데드라인 - 오늘
  return {
    current,
    target: c.target,
    pct,
    done,
    // 오늘 포함 남은 일수: 데드라인이 오늘이면 1, 지났으면 0.
    daysLeft: toDeadline >= 0 ? toDeadline + 1 : 0,
    expired: toDeadline < 0,
    upcoming: ymdDiff(today, c.startDate) > 0,
  };
}

/** 다짐이 특정 날짜에 '진행 중'인지(캘린더 밴드 표시용). */
export function isActiveOn(
  c: { startDate: string; deadline: string },
  ymd: string,
): boolean {
  return ymdDiff(c.startDate, ymd) >= 0 && ymdDiff(ymd, c.deadline) >= 0;
}
