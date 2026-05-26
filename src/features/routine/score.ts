/**
 * 운동 점수 — 완료된 세트의 실제 운동량(세트×횟수×무게)을 누적, 오래된 기록은 가중치 ↓.
 * points = (sets × reps × weightKg) / VOLUME_PER_POINT × 0.5^(days_ago/14)
 * 맨몸 운동은 사용자 체중으로 가중."휴식(skipped)" 건은 호출자가 미리 제외.
 */

import { seoulYmd } from "@/features/routine/data";

const HALF_LIFE_DAYS = 14;
const VOLUME_PER_POINT = 200; // 200 kg·reps = 1점 (조절 가능)

function ymdToEpochDay(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

export type DoneRecord = {
  forDate: string;
  /** 카탈로그상 운동 sets — 없으면 1로 가정 */
  sets?: number | null;
  /** 카탈로그상 운동 reps — 없으면 10으로 가정 */
  reps?: number | null;
  /** 운동 중량(kg). null/없으면 맨몸으로 보고 userWeightKg 사용 */
  weightKg?: number | null;
};

export type ScoreSummary = {
  score: number;
  totalCount: number;
  currentStreak: number;
  longestStreak: number;
  last7DayCount: number;
  lastCompletedYmd: string | null;
  normalized: number;
};

function pointsOf(r: DoneRecord, userWeightKg: number, age: number): number {
  const sets = r.sets ?? 1;
  const reps = r.reps ?? 10;
  const w = r.weightKg ?? userWeightKg;
  const volume = sets * reps * Math.max(0, w);
  return (volume / VOLUME_PER_POINT) * Math.pow(0.5, age / HALF_LIFE_DAYS);
}

export function computeScore(
  completions: DoneRecord[],
  userWeightKg: number,
): ScoreSummary {
  if (completions.length === 0) {
    return {
      score: 0,
      totalCount: 0,
      currentStreak: 0,
      longestStreak: 0,
      last7DayCount: 0,
      lastCompletedYmd: null,
      normalized: 0,
    };
  }

  const todayEpoch = ymdToEpochDay(seoulYmd());

  const score = completions.reduce((sum, c) => {
    const age = Math.max(0, todayEpoch - ymdToEpochDay(c.forDate));
    return sum + pointsOf(c, userWeightKg, age);
  }, 0);

  const dateEpochs = new Set(completions.map((c) => ymdToEpochDay(c.forDate)));

  const last7DayCount = Array.from(dateEpochs).filter(
    (e) => todayEpoch - e <= 6,
  ).length;

  let cursor = todayEpoch;
  let currentStreak = 0;
  if (!dateEpochs.has(cursor)) cursor -= 1;
  while (dateEpochs.has(cursor)) {
    currentStreak += 1;
    cursor -= 1;
  }

  const sortedDays = Array.from(dateEpochs).sort((a, b) => a - b);
  let longest = sortedDays.length > 0 ? 1 : 0;
  let run = sortedDays.length > 0 ? 1 : 0;
  for (let i = 1; i < sortedDays.length; i++) {
    if (sortedDays[i] === sortedDays[i - 1] + 1) {
      run += 1;
      if (run > longest) longest = run;
    } else {
      run = 1;
    }
  }

  // 100% 기준 — 한 달간 매일 5운동, 1운동당 4×10×60kg = 2400 ≈ 12점, ×150건 ≈ 1800점
  const CAP = 1800;
  const normalized = Math.min(100, Math.round((score / CAP) * 100));

  const sortedDesc = completions
    .map((c) => c.forDate)
    .sort((a, b) => (a < b ? 1 : -1));
  const lastCompletedYmd = sortedDesc[0] ?? null;

  return {
    score: Math.round(score),
    totalCount: completions.length,
    currentStreak,
    longestStreak: longest,
    last7DayCount,
    lastCompletedYmd,
    normalized,
  };
}

/**
 * 부위 → 마네킹 region 매핑(다중 부위 동작은 여러 region 에 기여)
 */
export const FOCUS_TO_REGIONS: Record<
  string,
  ("chest" | "back" | "shoulder" | "arm" | "leg" | "core")[]
> = {
  chest: ["chest"],
  back: ["back"],
  shoulder: ["shoulder"],
  arm: ["arm"],
  lower: ["leg"],
  core: ["core"],
  push: ["chest", "shoulder", "arm"],
  pull: ["back", "arm"],
  fullbody: ["chest", "back", "leg", "shoulder", "core"],
  upper: ["chest", "back", "shoulder", "arm"],
};

/**
 * 부위별 누적 점수 → 부위 간 상대비율로 밸런스 상태 산출.
 * - 가장 강한 부위 대비 70%↑ : balanced
 * - 40~70% : low (부족)
 * - <40% (또는 0) : under (심하게 부족 / 미운동)
 */
export type BalanceStatus = "balanced" | "low" | "under";

export function balanceStatusFor(
  regionPoints: number,
  maxRegionPoints: number,
): BalanceStatus {
  if (maxRegionPoints <= 0) return "under";
  const ratio = regionPoints / maxRegionPoints;
  if (ratio >= 0.7) return "balanced";
  if (ratio >= 0.4) return "low";
  return "under";
}

export const BALANCE_COLOR: Record<BalanceStatus, string> = {
  balanced: "#10b981", // emerald-500
  low: "#f59e0b", // amber-500
  under: "#f43f5e", // rose-500
};

export const BALANCE_LABEL: Record<BalanceStatus, string> = {
  balanced: "균형",
  low: "부족",
  under: "심하게 부족",
};
