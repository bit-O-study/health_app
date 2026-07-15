/**
 * 운동 목표(회원가입 설문) — 순수 모듈(server-only 없음 → 단위 테스트 가능).
 * 운동탭 체형기록에서 목표까지 '남은 양'을 계산해 보여준다.
 */

export type Goal = "weight_loss" | "fat_loss" | "muscle_gain" | "maintain";

export const GOALS: Goal[] = [
  "weight_loss",
  "fat_loss",
  "muscle_gain",
  "maintain",
];

export const GOAL_OPTIONS: { id: Goal; label: string; description: string }[] = [
  { id: "weight_loss", label: "체중 감량", description: "목표 체중까지 감량" },
  { id: "fat_loss", label: "체지방 감소", description: "목표 체지방률까지" },
  { id: "muscle_gain", label: "근육 증가", description: "목표 근육량까지 증량" },
  { id: "maintain", label: "현재 유지", description: "지금 체형을 유지" },
];

export const GOAL_LABEL: Record<Goal, string> = {
  weight_loss: "체중 감량",
  fat_loss: "체지방 감소",
  muscle_gain: "근육 증가",
  maintain: "현재 유지",
};

export function isGoal(v: unknown): v is Goal {
  return (
    v === "weight_loss" ||
    v === "fat_loss" ||
    v === "muscle_gain" ||
    v === "maintain"
  );
}

/** 목표에 필요한 목표치 종류 — 유지는 목표치 없음. */
export function goalTargetKind(
  goal: Goal,
): "weight" | "bodyFat" | "muscle" | null {
  if (goal === "weight_loss") return "weight";
  if (goal === "fat_loss") return "bodyFat";
  if (goal === "muscle_gain") return "muscle";
  return null;
}

export type GoalCurrent = {
  weightKg: number | null;
  bodyFatPct: number | null;
  muscleMassKg: number | null;
};

export type GoalTargets = {
  targetWeightKg: number | null;
  targetBodyFatPct: number | null;
  targetMuscleKg: number | null;
};

/** 목표 지표 한글 이름 — '무엇이' 남았는지 표시용. */
export const GOAL_METRIC_LABEL: Record<
  Exclude<Goal, "maintain">,
  string
> = {
  weight_loss: "체중",
  fat_loss: "체지방",
  muscle_gain: "근육",
};

export type GoalProgress = {
  goal: Goal;
  /** 지표 이름(체중/체지방/근육). */
  metricLabel: string;
  /** 남은 양(절대값, 소수 1자리). 도달했으면 0. */
  remaining: number;
  unit: "kg" | "%";
  /** "3.2kg" 처럼 남은 양+단위. */
  remainingText: string;
  /** 목표 달성 여부. */
  reached: boolean;
  /** 목표치 표시용(예: "목표 체중 70kg"). */
  targetText: string;
  /** 한 줄 표시(예: "체중 3.2kg 남음", "체중 목표 달성"). */
  label: string;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * 목표 대비 남은 양. 목표/현재값/목표치가 없거나(유지 목표 포함) 계산 불가면 null.
 *   - weight_loss: 현재체중 − 목표체중 (감량)
 *   - fat_loss:    현재체지방% − 목표체지방% (감소)
 *   - muscle_gain: 목표근육 − 현재근육 (증량)
 */
export function goalProgress(
  goal: Goal | null,
  current: GoalCurrent,
  targets: GoalTargets,
): GoalProgress | null {
  if (!goal || goal === "maintain") return null;

  let cur: number | null;
  let tgt: number | null;
  let unit: "kg" | "%";
  let diff: number; // 양수면 아직 남음

  if (goal === "weight_loss") {
    cur = current.weightKg;
    tgt = targets.targetWeightKg;
    unit = "kg";
    if (cur == null || tgt == null) return null;
    diff = cur - tgt;
  } else if (goal === "fat_loss") {
    cur = current.bodyFatPct;
    tgt = targets.targetBodyFatPct;
    unit = "%";
    if (cur == null || tgt == null) return null;
    diff = cur - tgt;
  } else {
    // muscle_gain
    cur = current.muscleMassKg;
    tgt = targets.targetMuscleKg;
    unit = "kg";
    if (cur == null || tgt == null) return null;
    diff = tgt - cur;
  }

  const remaining = round1(Math.max(0, diff));
  const reached = diff <= 0;
  const metricLabel = GOAL_METRIC_LABEL[goal];
  const remainingText = `${remaining}${unit}`;
  const targetText = `목표 ${metricLabel} ${round1(tgt)}${unit}`;
  const label = reached
    ? `${metricLabel} 목표 달성 🎉`
    : `${metricLabel} ${remainingText} 남음`;

  return {
    goal,
    metricLabel,
    remaining,
    unit,
    remainingText,
    reached,
    targetText,
    label,
  };
}