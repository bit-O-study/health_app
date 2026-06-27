/**
 * 월경 주기 예측 — 순수 모듈(테스트 가능).
 *
 * 과거 생리 '시작일'들의 간격으로 평균 주기를 추정해 다음 생리·배란·가임기를 예측한다.
 * 데이터가 적으면 일반적 기본값(주기 28일·생리 5일)을 쓴다. 의료 조언이 아니라 참고용.
 */

const DEFAULT_CYCLE = 28;
const DEFAULT_PERIOD = 5;
const MIN_CYCLE = 21;
const MAX_CYCLE = 40;

const epochDay = (ymd: string): number => {
  const [y, m, d] = ymd.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
};
const fromEpochDay = (n: number): string => {
  const dt = new Date(n * 86_400_000);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export type CyclePrediction = {
  avgCycle: number;
  avgPeriod: number;
  lastStart: string | null;
  nextStart: string | null;
  ovulation: string | null;
  fertileFrom: string | null;
  fertileTo: string | null;
  daysUntilNext: number | null;
  dayOfCycle: number | null;
};

/**
 * @param startDates 생리 시작일 목록(YYYY-MM-DD). 순서 무관.
 * @param today 오늘(YYYY-MM-DD).
 * @param periodLen 평균 생리일수(있으면).
 */
export function predictCycle(
  startDates: string[],
  today: string,
  periodLen = DEFAULT_PERIOD,
): CyclePrediction {
  const starts = [...new Set(startDates)].sort();
  const avgPeriod = periodLen;
  if (starts.length === 0) {
    return {
      avgCycle: DEFAULT_CYCLE,
      avgPeriod,
      lastStart: null,
      nextStart: null,
      ovulation: null,
      fertileFrom: null,
      fertileTo: null,
      daysUntilNext: null,
      dayOfCycle: null,
    };
  }

  // 평균 주기 — 최근 간격들의 중앙값(이상치에 강함). 1개뿐이면 기본값.
  let avgCycle = DEFAULT_CYCLE;
  if (starts.length >= 2) {
    const gaps: number[] = [];
    for (let i = 1; i < starts.length; i++) {
      gaps.push(epochDay(starts[i]) - epochDay(starts[i - 1]));
    }
    const recent = gaps.slice(-6);
    avgCycle = Math.min(MAX_CYCLE, Math.max(MIN_CYCLE, Math.round(median(recent))));
  }

  const lastStart = starts[starts.length - 1];
  const t = epochDay(today);
  // 다음 생리 예정일 — 마지막 시작 + 주기. 이미 지났으면 주기만큼 앞으로 굴려 '다가오는' 날.
  let nextEpoch = epochDay(lastStart) + avgCycle;
  while (nextEpoch <= t) nextEpoch += avgCycle;
  const nextStart = fromEpochDay(nextEpoch);
  const ovEpoch = nextEpoch - 14;

  return {
    avgCycle,
    avgPeriod,
    lastStart,
    nextStart,
    ovulation: fromEpochDay(ovEpoch),
    fertileFrom: fromEpochDay(ovEpoch - 5),
    fertileTo: fromEpochDay(ovEpoch + 1),
    daysUntilNext: nextEpoch - t,
    dayOfCycle: t >= epochDay(lastStart) ? t - epochDay(lastStart) + 1 : null,
  };
}

/**
 * 예측 생리일(미래)을 [from, to] 범위에서 나열. 마지막 시작일부터 주기 간격으로
 * 여러 사이클을 투영하고, 각 사이클의 생리기간(avgPeriod일)을 펼친다.
 * (실제 기록된 날은 호출부가 따로 빼서 '예정'과 구분.)
 */
export function predictedPeriodDatesInRange(
  pred: CyclePrediction,
  from: string,
  to: string,
): string[] {
  if (!pred.lastStart) return [];
  const out: string[] = [];
  const fromE = epochDay(from);
  const toE = epochDay(to);
  let startE = epochDay(pred.lastStart);
  // 범위 시작 근처까지 이동
  while (startE + pred.avgCycle <= fromE - pred.avgPeriod) startE += pred.avgCycle;
  for (let guard = 0; guard < 24; guard++) {
    startE += pred.avgCycle;
    if (startE > toE) break;
    for (let d = 0; d < pred.avgPeriod; d++) {
      const e = startE + d;
      if (e >= fromE && e <= toE) out.push(fromEpochDay(e));
    }
  }
  return out;
}
