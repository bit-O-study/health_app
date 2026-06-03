/**
 * 점진적 과부하 추적 — 완료 운동 기록을 1RM 추이·총 볼륨 시계열로 집계한다.
 * server-only 의존성 없는 순수 함수(페이지·테스트 공용).
 */

export type ProgressRecord = {
  forDate: string;
  exerciseId: string | null;
  status: "done" | "skipped";
  sets: number | null;
  reps: number | null;
  weightKg: number | null;
};

export type Point = { date: string; value: number };

/** 추정 1RM (Epley): weight × (1 + reps/30). 맨몸/0중량/0회는 0(추정 불가). */
export function estimate1RM(
  weightKg: number | null,
  reps: number | null,
): number {
  const w = weightKg ?? 0;
  const r = reps ?? 0;
  if (w <= 0 || r <= 0) return 0;
  if (r === 1) return w;
  return Math.round(w * (1 + r / 30) * 10) / 10;
}

/** 1세트 등가 볼륨 = sets × reps × weight(맨몸=0). */
export function setVolume(
  sets: number | null,
  reps: number | null,
  weightKg: number | null,
): number {
  const s = sets ?? 0;
  const r = reps ?? 0;
  const w = weightKg ?? 0;
  return s * r * Math.max(0, w);
}

const byDateAsc = (a: Point, b: Point) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);

/** 날짜별 총 볼륨 시계열(오름차순). */
export function dailyVolumeSeries(records: ProgressRecord[]): Point[] {
  const map = new Map<string, number>();
  for (const c of records) {
    if (c.status !== "done") continue;
    const v = setVolume(c.sets, c.reps, c.weightKg);
    if (v <= 0) continue;
    map.set(c.forDate, (map.get(c.forDate) ?? 0) + v);
  }
  return [...map.entries()]
    .map(([date, value]) => ({ date, value: Math.round(value) }))
    .sort(byDateAsc);
}

/** 특정 종목의 날짜별 추정 1RM 최고치 시계열(오름차순). */
export function oneRMSeries(
  records: ProgressRecord[],
  exerciseId: string,
): Point[] {
  const map = new Map<string, number>();
  for (const c of records) {
    if (c.status !== "done" || c.exerciseId !== exerciseId) continue;
    const e = estimate1RM(c.weightKg, c.reps);
    if (e <= 0) continue;
    map.set(c.forDate, Math.max(map.get(c.forDate) ?? 0, e));
  }
  return [...map.entries()].map(([date, value]) => ({ date, value })).sort(byDateAsc);
}

/** 총 볼륨이 많은 종목 순위(중량 운동만 — 1RM 추적 대상 선정용). */
export function topExercisesByVolume(
  records: ProgressRecord[],
  n = 6,
): { exerciseId: string; volume: number }[] {
  const map = new Map<string, number>();
  for (const c of records) {
    if (c.status !== "done" || !c.exerciseId) continue;
    const v = setVolume(c.sets, c.reps, c.weightKg);
    if (v <= 0) continue;
    map.set(c.exerciseId, (map.get(c.exerciseId) ?? 0) + v);
  }
  return [...map.entries()]
    .map(([exerciseId, volume]) => ({ exerciseId, volume: Math.round(volume) }))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, n);
}

/** 시계열 첫 값 대비 마지막 값 변화율(%). 데이터 2개 미만이거나 첫 값 0이면 null. */
export function trendPct(series: Point[]): number | null {
  if (series.length < 2) return null;
  const first = series[0].value;
  const last = series[series.length - 1].value;
  if (first <= 0) return null;
  return Math.round(((last - first) / first) * 100);
}
