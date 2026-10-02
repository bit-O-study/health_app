/**
 * 라이트(990원) 내 데이터 리포트 — 체성분 변화 · 컨디션 · 식단 월간(2026-10-02, 혜택 1단계 A1~A3).
 *
 * 순수 모듈. 이미 모으는데 화면에 안 보이던 기록을 숫자로 돌려준다. AI 없음(원가 0원).
 * 보고서: `docs/lite-perks-2026-10-01.html`.
 */
import { adviceFor, type Checkin } from "@/features/routine/checkin";
import type { Point } from "@/features/routine/progress";

const round1 = (n: number) => Math.round(n * 10) / 10;

/* ─── A1 체성분 변화 ─────────────────────────────────────────────────── */

export type BodyCompRow = {
  date: string;
  weightKg: number | null;
  muscleKg: number | null;
  fatKg: number | null;
  fatPct: number | null;
};

export type BodyCompMetric = "weightKg" | "muscleKg" | "fatKg" | "fatPct";

export const BODY_COMP_METRICS: { key: BodyCompMetric; label: string; unit: string; goodWhenUp: boolean }[] = [
  { key: "muscleKg", label: "골격근량", unit: "kg", goodWhenUp: true },
  { key: "fatKg", label: "체지방량", unit: "kg", goodWhenUp: false },
  { key: "fatPct", label: "체지방률", unit: "%", goodWhenUp: false },
  { key: "weightKg", label: "체중", unit: "kg", goodWhenUp: false },
];

export type BodyCompLine = {
  key: BodyCompMetric;
  label: string;
  unit: string;
  latest: number;
  /** 지난 측정 대비(측정 1번이면 null). */
  sincePrev: number | null;
  /** 첫 측정 대비(측정 1번이면 null). */
  sinceFirst: number | null;
  /** 좋아진 쪽인가 — 근육은 늘면, 지방·체중은 줄면. 변화 없으면 null. */
  better: boolean | null;
  series: Point[];
};

export type BodyCompReport = {
  count: number;
  firstDate: string | null;
  latestDate: string | null;
  prevDate: string | null;
  lines: BodyCompLine[];
};

/** 측정 기록(순서 상관없음) → 항목별 최신값·지난 측정 대비·첫 측정 대비·추이. 값이 없는 항목은 뺀다. */
export function bodyCompReport(rows: readonly BodyCompRow[]): BodyCompReport {
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const lines: BodyCompLine[] = [];
  for (const m of BODY_COMP_METRICS) {
    const pts = sorted
      .filter((r) => r[m.key] != null && Number.isFinite(r[m.key] as number))
      .map((r) => ({ date: r.date, value: r[m.key] as number }));
    if (pts.length === 0) continue;
    const latest = pts[pts.length - 1].value;
    const sincePrev = pts.length > 1 ? round1(latest - pts[pts.length - 2].value) : null;
    const sinceFirst = pts.length > 1 ? round1(latest - pts[0].value) : null;
    const better = sinceFirst == null || sinceFirst === 0 ? null : sinceFirst > 0 === m.goodWhenUp;
    lines.push({ key: m.key, label: m.label, unit: m.unit, latest, sincePrev, sinceFirst, better, series: pts });
  }
  return {
    count: sorted.length,
    firstDate: sorted[0]?.date ?? null,
    latestDate: sorted[sorted.length - 1]?.date ?? null,
    prevDate: sorted.length > 1 ? sorted[sorted.length - 2].date : null,
    lines,
  };
}

/** +0.8 / −1.2 / 0 — 부호를 붙인 한 자리. */
export function signed(n: number): string {
  if (n === 0) return "0";
  return `${n > 0 ? "+" : "−"}${Math.abs(n).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}`;
}

/* ─── A2 컨디션 ──────────────────────────────────────────────────────── */

export type ConditionDay = { date: string; kind: "light" | "normal" | "good" | null };

export type ConditionReport = {
  /** 오래된 날 → 오늘, 길이 = days. 체크인 안 한 날은 kind null. */
  days: ConditionDay[];
  checked: number;
  counts: { good: number; normal: number; light: number };
  /** 컨디션 좋은 날·안 좋은 날 운동한 날의 평균 볼륨(kg). 그런 날이 없으면 null. */
  avgVolumeGood: number | null;
  avgVolumeLight: number | null;
  /** 가장 자주 '나쁨'이었던 항목(동률이면 잠 → 근육통 → 기운). 한 번도 없으면 null. */
  weakest: keyof Checkin | null;
};

export const CHECKIN_ITEM_LABEL: Record<keyof Checkin, string> = { sleep: "잠", soreness: "근육통", energy: "기운" };

function addDays(ymd: string, n: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * 최근 days일 컨디션 — 체크인(잠·근육통·기운)을 권하는 강도(light/normal/good)로 묶고,
 * 운동한 날 볼륨과 짝지어 "컨디션이 기록에 주는 영향"을 숫자로.
 */
export function conditionReport(
  checkins: readonly (Checkin & { date: string })[],
  volumeByDate: ReadonlyMap<string, number>,
  today: string,
  days = 28,
): ConditionReport {
  const byDate = new Map(checkins.map((c) => [c.date, c]));
  const list: ConditionDay[] = [];
  const counts = { good: 0, normal: 0, light: 0 };
  const vols: Record<"good" | "light", number[]> = { good: [], light: [] };
  const bad: Record<keyof Checkin, number> = { sleep: 0, soreness: 0, energy: 0 };
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    const c = byDate.get(date);
    if (!c) {
      list.push({ date, kind: null });
      continue;
    }
    const kind = adviceFor(c).kind;
    list.push({ date, kind });
    counts[kind] += 1;
    for (const k of ["sleep", "soreness", "energy"] as const) if (c[k] === 1) bad[k] += 1;
    const v = volumeByDate.get(date) ?? 0;
    if (v > 0 && kind !== "normal") vols[kind].push(v);
  }
  const avg = (a: number[]) => (a.length ? Math.round(a.reduce((s, x) => s + x, 0) / a.length) : null);
  const top = (["sleep", "soreness", "energy"] as const).reduce<keyof Checkin | null>(
    (best, k) => (bad[k] > 0 && (best === null || bad[k] > bad[best]) ? k : best),
    null,
  );
  return {
    days: list,
    checked: counts.good + counts.normal + counts.light,
    counts,
    avgVolumeGood: avg(vols.good),
    avgVolumeLight: avg(vols.light),
    weakest: top,
  };
}

/* ─── A3 식단 월간 ───────────────────────────────────────────────────── */

export type FoodRow = { date: string; name: string; kcal: number; proteinG: number; carbsG: number; fatG: number };

export type DietMonthReport = {
  month: string;
  /** 하나라도 기록한 날. */
  loggedDays: number;
  /** 기록한 날 평균. */
  avgKcal: number;
  avgProteinG: number;
  avgCarbsG: number;
  avgFatG: number;
  /** 단백질 목표를 채운 날. */
  proteinHitDays: number;
  /** 칼로리가 목표 ±10% 안이었던 날. */
  kcalOnTargetDays: number;
  /** 자주 먹은 음식(이름별 횟수) 상위. */
  topFoods: { name: string; count: number }[];
  /** 운동한 날 / 쉰 날 평균 단백질(그런 날이 없으면 null). */
  proteinWorkoutDays: number | null;
  proteinRestDays: number | null;
};

/** 한 달(YYYY-MM) 식단 — 기록한 날만 평균 낸다(안 적은 날을 0kcal로 치면 숫자가 거짓말을 한다). */
export function dietMonthReport(
  rows: readonly FoodRow[],
  month: string,
  target: { kcal: number; proteinG: number },
  workoutDates: ReadonlySet<string>,
  topN = 5,
): DietMonthReport {
  const inMonth = rows.filter((r) => r.date.startsWith(month));
  const byDay = new Map<string, { kcal: number; p: number; c: number; f: number }>();
  const foods = new Map<string, number>();
  for (const r of inMonth) {
    const d = byDay.get(r.date) ?? { kcal: 0, p: 0, c: 0, f: 0 };
    d.kcal += r.kcal || 0;
    d.p += r.proteinG || 0;
    d.c += r.carbsG || 0;
    d.f += r.fatG || 0;
    byDay.set(r.date, d);
    const name = r.name.trim();
    if (name) foods.set(name, (foods.get(name) ?? 0) + 1);
  }
  const days = [...byDay.entries()];
  const n = days.length;
  const mean = (pick: (d: { kcal: number; p: number; c: number; f: number }) => number) =>
    n ? Math.round(days.reduce((s, [, d]) => s + pick(d), 0) / n) : 0;
  const proteinOf = (pred: (date: string) => boolean) => {
    const xs = days.filter(([date]) => pred(date)).map(([, d]) => d.p);
    return xs.length ? Math.round(xs.reduce((s, x) => s + x, 0) / xs.length) : null;
  };
  return {
    month,
    loggedDays: n,
    avgKcal: mean((d) => d.kcal),
    avgProteinG: mean((d) => d.p),
    avgCarbsG: mean((d) => d.c),
    avgFatG: mean((d) => d.f),
    proteinHitDays: days.filter(([, d]) => d.p >= target.proteinG).length,
    kcalOnTargetDays: days.filter(([, d]) => Math.abs(d.kcal - target.kcal) <= target.kcal * 0.1).length,
    topFoods: [...foods.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, topN)
      .map(([name, count]) => ({ name, count })),
    proteinWorkoutDays: proteinOf((d) => workoutDates.has(d)),
    proteinRestDays: proteinOf((d) => !workoutDates.has(d)),
  };
}

/* ─── A4 수분·걸음 주간 ──────────────────────────────────────────────── */

/** 하루 걸음 목표 — 하루 7,000보부터 사망·질병 위험이 크게 준다는 연구들의 선(만 보는 마케팅 숫자). */
export const STEP_GOAL = 7_000;

export type WeekStat = {
  /** 기록한 날 평균(기록이 하나도 없으면 null). */
  avg: number | null;
  /** 목표 이상인 날. */
  hitDays: number;
  /** 기록한 날. */
  days: number;
};

export type WeeklyHabitReport = {
  /** 이번 주 = 오늘 포함 최근 7일, 지난주 = 그 전 7일. */
  water: { thisWeek: WeekStat; lastWeek: WeekStat; goalMl: number };
  steps: { thisWeek: WeekStat; lastWeek: WeekStat; goal: number };
  /** 최근 7일(오래된 날 → 오늘). 없는 날은 null. */
  days: { date: string; waterMl: number | null; steps: number | null }[];
};

function weekStat(values: (number | null)[], goal: number): WeekStat {
  const xs = values.filter((v): v is number => v != null && v > 0);
  return {
    avg: xs.length ? Math.round(xs.reduce((s, x) => s + x, 0) / xs.length) : null,
    hitDays: xs.filter((x) => x >= goal).length,
    days: xs.length,
  };
}

/** 최근 7일과 그 전 7일의 수분·걸음 — 0은 '기록 없음'으로 본다(0ml 마신 날은 없다). */
export function weeklyHabitReport(
  water: ReadonlyMap<string, number>,
  steps: ReadonlyMap<string, number>,
  today: string,
  waterGoalMl: number,
): WeeklyHabitReport {
  const range = (from: number) => Array.from({ length: 7 }, (_, i) => addDays(today, from + i));
  const thisDates = range(-6);
  const lastDates = range(-13);
  const get = (m: ReadonlyMap<string, number>, d: string) => {
    const v = m.get(d);
    return v != null && v > 0 ? v : null;
  };
  return {
    water: {
      thisWeek: weekStat(thisDates.map((d) => get(water, d)), waterGoalMl),
      lastWeek: weekStat(lastDates.map((d) => get(water, d)), waterGoalMl),
      goalMl: waterGoalMl,
    },
    steps: {
      thisWeek: weekStat(thisDates.map((d) => get(steps, d)), STEP_GOAL),
      lastWeek: weekStat(lastDates.map((d) => get(steps, d)), STEP_GOAL),
      goal: STEP_GOAL,
    },
    days: thisDates.map((date) => ({ date, waterMl: get(water, date), steps: get(steps, date) })),
  };
}
