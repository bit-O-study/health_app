/**
 * 다짐 주별·월별 변화(2026-10-07) — 순수 로직.
 *
 * - **주별 = 다짐 구간**(시작일부터 7일씩). 성공·실패 판정 칸(evaluation.ts)과 같은 칸이라
 *   표 색과 판정이 어긋나지 않는다. 값은 구간 결과(`BlockResult.items`)를 그대로 쓴다.
 * - **월별 = 달력 월**, 30일 넘는 다짐에서만. 칸 색은 그 달에 걸친 판정 끝난 구간을 모두 지켰나.
 * - **지난주와 비교는 같은 일수끼리** — 이번 구간이 3일째면 지난 구간도 첫 3일만 본다
 *   (아니면 진행 중인 주가 늘 줄어든 것처럼 보인다).
 * 검수보고서: 다짐 · 회원 주별 월별 변화(2026-10-07).
 */

import { BODY_PART_LABEL, type BodyPart } from "@/features/routine/exercise-catalog-labels";
import type { PledgeSpec } from "@/features/commitments/pledge";
import {
  addDays,
  dayDiff,
  evaluateBlock,
  type BlockResult,
  type PledgeDay,
  type ProgressItem,
} from "@/features/commitments/evaluation";

export type CellState = "ok" | "no" | "now" | "future";
export type TrendCell = { text: string; state: CellState };
export type TrendRow = { key: string; label: string; cells: TrendCell[] };
export type TrendTable = { cols: string[]; rows: TrendRow[] };
export type ComparePart = { text: string; good: boolean };
export type BodyPoint = { label: string; actual: number | null; predicted: number | null };
export type BodyTrend = {
  metric: "weight" | "muscle";
  /** 주별·월별 점(같은 칸 순서). */
  weekly: BodyPoint[];
  monthly: BodyPoint[] | null;
  /** "−0.7kg · 예상대로" — 실제 점이 없으면 null. */
  summary: { change: number; verdict: "on" | "ahead" | "behind" } | null;
};
export type PledgeTrend = {
  weekly: TrendTable;
  monthly: TrendTable | null;
  /** 지난 구간 같은 일수 대비. 첫 구간이거나 오늘이 구간 첫날 전이면 null. */
  compare: ComparePart[] | null;
  /** 지난달 같은 날짜까지 대비(월별 켜졌을 때). */
  compareMonth: ComparePart[] | null;
  body: BodyTrend | null;
};

/** 월별 표는 이 일수를 넘는 다짐에서만. */
export const MONTHLY_MIN_DAYS = 30;

/** 표 줄 이름 — 짧게(목표 수치까지 한 줄에). */
export function shortLabel(key: string, spec: PledgeSpec): string {
  if (key === "workout") {
    return spec.burnKcal !== undefined ? `소모 ${spec.burnKcal}+ 주${spec.workoutDays}일` : `운동 주${spec.workoutDays}일`;
  }
  if (key.startsWith("strength:")) {
    const part = key.slice(9);
    const s = spec.strength?.find((x) => x.part === part);
    const name = part === "any" ? "근력" : BODY_PART_LABEL[part as BodyPart];
    return `${name} 주${s?.perWeek ?? ""}회`;
  }
  if (key === "cardio") return `유산소 주${spec.cardioMinWeek}분`;
  if (key === "steps") return `${(spec.steps!.steps / 1000).toLocaleString()}천보 주${spec.steps!.perWeek}일`;
  if (key === "meals") return `${spec.mealsPerDay}끼 기록`;
  if (key === "intakeMax") return `섭취 ≤${spec.intakeMax!.toLocaleString()}`;
  if (key === "intakeMin") return `섭취 ≥${spec.intakeMin!.toLocaleString()}`;
  if (key === "protein") return `단백질 ${spec.proteinG}g`;
  return key;
}

/** 비교 문장에 쓰는 이름. */
const COMPARE_NAME: Record<string, string> = {
  workout: "운동",
  cardio: "유산소",
  steps: "걸은 날",
  meals: "끼니 기록",
  intakeMax: "섭취",
  intakeMin: "섭취",
  protein: "단백질",
};
const compareName = (key: string) =>
  key.startsWith("strength:")
    ? key === "strength:any"
      ? "근력"
      : `${BODY_PART_LABEL[key.slice(9) as BodyPart]} 운동`
    : (COMPARE_NAME[key] ?? key);

/** 평균으로 보는 항목(늘었어요/줄었어요) — 나머지는 횟수(많아요/적어요). */
const isAverage = (it: ProgressItem) => it.unit === "kcal" || it.unit === "g";

function cellText(it: ProgressItem, seenDays: number): string {
  if (it.key === "meals") return `${it.have}/${seenDays}`;
  return it.have.toLocaleString();
}

function blockState(b: BlockResult, today: string, ok: boolean): CellState {
  if (b.start > today) return "future";
  if (!b.closed) return "now";
  return ok ? "ok" : "no";
}

/** 주별 표 — 구간 결과 그대로. */
export function weeklyTable(spec: PledgeSpec, blocks: readonly BlockResult[], today: string): TrendTable {
  const keys = blocks[0]?.items.map((i) => i.key) ?? [];
  return {
    cols: blocks.map((b) => `${b.index + 1}주`),
    rows: keys.map((key) => ({
      key,
      label: shortLabel(key, spec),
      cells: blocks.map((b) => {
        const it = b.items.find((i) => i.key === key)!;
        const state = blockState(b, today, it.ok);
        const seen = b.closed ? b.days : Math.max(0, dayDiff(b.start, today) + 1);
        return { state, text: state === "future" ? "·" : cellText(it, Math.min(b.days, seen)) };
      }),
    })),
  };
}

/** 두 결과의 항목 차이 → 문장 조각(변화 큰 순 2개). 바뀐 게 없으면 빈 배열. */
export function compareItems(prev: readonly ProgressItem[], cur: readonly ProgressItem[]): ComparePart[] {
  const diffs = cur
    .map((c) => {
      const p = prev.find((x) => x.key === c.key);
      if (!p) return null;
      const diff = c.have - p.have;
      if (diff === 0) return null;
      // 상한(섭취 ≤)은 줄어야 좋다. 나머지는 늘어야 좋다.
      const good = c.dir === "atmost" ? diff < 0 : diff > 0;
      return { c, diff, good, weight: Math.abs(diff) / Math.max(1, c.need) };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 2);
  return diffs.map(({ c, diff, good }) => {
    const n = Math.abs(diff).toLocaleString();
    const word = isAverage(c) ? (diff > 0 ? "늘었어요" : "줄었어요") : diff > 0 ? "많아요" : "적어요";
    return { text: `${compareName(c.key)} ${n}${c.unit} ${word}`, good };
  });
}

/**
 * 이번 구간 vs 지난 구간 — **같은 일수끼리**. 이번 구간에서 지난 날(오늘 포함) 수만큼
 * 지난 구간 앞부분을 잘라 같은 규칙(evaluateBlock)으로 다시 센다.
 */
export function compareWithLastBlock(
  spec: PledgeSpec,
  blocks: readonly BlockResult[],
  dayOf: (ymd: string) => PledgeDay,
  today: string,
): ComparePart[] | null {
  const curIdx = blocks.findIndex((b) => b.start <= today && today <= b.end);
  if (curIdx <= 0) return null;
  const cur = blocks[curIdx];
  const prev = blocks[curIdx - 1];
  const n = Math.min(cur.days, prev.days, dayDiff(cur.start, today) + 1);
  const far = "9999-12-31";
  const a = evaluateBlock(spec, { index: prev.index, start: prev.start, end: addDays(prev.start, n - 1), days: n }, dayOf, far);
  const b = evaluateBlock(spec, { index: cur.index, start: cur.start, end: addDays(cur.start, n - 1), days: n }, dayOf, far);
  return compareItems(a.items, b.items);
}

const monthOf = (ymd: string) => ymd.slice(0, 7);
const monthLabel = (ym: string) => `${Number(ym.slice(5))}월`;

function monthsBetween(from: string, to: string): string[] {
  const out: string[] = [];
  let [y, m] = from.slice(0, 7).split("-").map(Number);
  const end = to.slice(0, 7);
  for (;;) {
    const ym = `${y}-${String(m).padStart(2, "0")}`;
    out.push(ym);
    if (ym >= end) break;
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

/** 한 기간(날짜들)의 항목 값 — evaluateBlock 과 같은 규칙(가짜 구간 하나로 센다). */
function itemsFor(spec: PledgeSpec, dates: readonly string[], dayOf: (ymd: string) => PledgeDay): ProgressItem[] {
  if (dates.length === 0) return [];
  // 날짜가 이어져 있다(한 달 안의 다짐 기간) — 첫날부터 날짜 수만큼.
  return evaluateBlock(
    spec,
    { index: 0, start: dates[0], end: dates[dates.length - 1], days: dates.length },
    dayOf,
    "9999-12-31",
  ).items;
}

/** 월별 표 — 30일 넘는 다짐만. 값은 그 달(다짐 기간 ∩ 오늘까지)의 합계·평균. */
export function monthlyTable(
  spec: PledgeSpec,
  startDate: string,
  endDate: string,
  blocks: readonly BlockResult[],
  dayOf: (ymd: string) => PledgeDay,
  today: string,
): TrendTable | null {
  if (spec.days <= MONTHLY_MIN_DAYS) return null;
  const months = monthsBetween(startDate, endDate);
  const keys = blocks[0]?.items.map((i) => i.key) ?? [];
  const last = today < endDate ? today : endDate;
  const perMonth = months.map((ym) => {
    const dates: string[] = [];
    for (let d = startDate; d <= last; d = addDays(d, 1)) if (monthOf(d) === ym) dates.push(d);
    return { ym, dates, items: itemsFor(spec, dates, dayOf) };
  });
  return {
    cols: months.map(monthLabel),
    rows: keys.map((key) => ({
      key,
      label: shortLabel(key, spec),
      cells: perMonth.map(({ ym, dates, items }) => {
        if (dates.length === 0) return { text: "·", state: "future" as const };
        const touching = blocks.filter((b) => monthOf(b.start) <= ym && ym <= monthOf(b.end) && b.start <= today);
        const failed = touching.some((b) => b.closed && b.items.find((i) => i.key === key)?.ok === false);
        const open = touching.some((b) => !b.closed);
        const state: CellState = failed ? "no" : open ? "now" : "ok";
        const it = items.find((i) => i.key === key)!;
        return { text: cellText(it, dates.length), state };
      }),
    })),
  };
}

/** 이번 달 vs 지난달 — 같은 날짜까지(오늘이 10일이면 두 달 모두 1~10일 중 다짐 기간). */
export function compareWithLastMonth(
  spec: PledgeSpec,
  startDate: string,
  dayOf: (ymd: string) => PledgeDay,
  today: string,
): ComparePart[] | null {
  if (spec.days <= MONTHLY_MIN_DAYS) return null;
  const day = Number(today.slice(8, 10));
  const [y, m] = today.slice(0, 7).split("-").map(Number);
  const prevYm = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
  const range = (ym: string) => {
    const out: string[] = [];
    for (let i = 1; i <= day; i++) {
      const d = `${ym}-${String(i).padStart(2, "0")}`;
      if (monthOf(addDays(d, 0)) === ym && d >= startDate && d <= today) out.push(d);
    }
    return out;
  };
  const prev = range(prevYm);
  const cur = range(monthOf(today));
  // 지난달에 다짐을 안 했으면(기간 밖) 비교하지 않는다. 일수가 다르면 공평하지 않다.
  if (prev.length === 0 || prev.length !== cur.length) return null;
  return compareItems(itemsFor(spec, prev, dayOf), itemsFor(spec, cur, dayOf));
}

const avgOf = (xs: number[]) => (xs.length ? Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 10) / 10 : null);

/**
 * 몸 변화 — 근육 늘리기 다짐(예상 골격근 +, 체중 감량 아님)이면 골격근, 아니면 체중.
 * 실제는 칸 안 측정값 평균(없으면 비움 — 앞 값을 끌어오지 않는다), 예상은 시작값 + 예상 변화 × 지난 비율.
 */
export function bodyTrend(args: {
  startDate: string;
  days: number;
  blocks: readonly BlockResult[];
  monthlyCols: string[] | null;
  today: string;
  baseline: { weightKg: number | null; muscleKg: number | null };
  predicted: { weightKg: number | null; muscleKg: number | null } | null;
  weights: readonly { date: string; kg: number }[];
  muscles: readonly { date: string; kg: number }[];
}): BodyTrend | null {
  const pm = args.predicted?.muscleKg ?? null;
  const pw = args.predicted?.weightKg ?? null;
  const metric: "weight" | "muscle" = pm !== null && pm > 0 && (pw === null || pw >= 0) && args.muscles.length > 0 ? "muscle" : "weight";
  const base = metric === "muscle" ? args.baseline.muscleKg : args.baseline.weightKg;
  const change = metric === "muscle" ? pm : pw;
  const pts = (metric === "muscle" ? args.muscles : args.weights).filter((p) => p.date >= args.startDate && p.date <= args.today);
  if (base === null && pts.length === 0) return null;
  const predAt = (endYmd: string): number | null => {
    if (base === null || change === null) return null;
    const frac = Math.min(1, (dayDiff(args.startDate, endYmd) + 1) / args.days);
    return Math.round((base + change * frac) * 10) / 10;
  };
  const weekly: BodyPoint[] = args.blocks.map((b) => ({
    label: `${b.index + 1}주`,
    actual: b.start > args.today ? null : avgOf(pts.filter((p) => p.date >= b.start && p.date <= b.end).map((p) => p.kg)),
    predicted: predAt(b.end),
  }));
  let monthly: BodyPoint[] | null = null;
  if (args.monthlyCols) {
    const months = monthsBetween(args.startDate, addDays(args.startDate, args.days - 1));
    const end = addDays(args.startDate, args.days - 1);
    monthly = months.map((ym) => {
      const lastDay = addDays(`${monthOf(addDays(`${ym}-28`, 4))}-01`, -1);
      return {
        label: monthLabel(ym),
        actual: avgOf(pts.filter((p) => monthOf(p.date) === ym).map((p) => p.kg)),
        predicted: predAt(lastDay < end ? lastDay : end),
      };
    });
  }
  const lastPt = pts.at(-1);
  let summary: BodyTrend["summary"] = null;
  if (lastPt && base !== null) {
    const actualChange = Math.round((lastPt.kg - base) * 10) / 10;
    const expected = change === null ? null : change * Math.min(1, (dayDiff(args.startDate, lastPt.date) + 1) / args.days);
    let verdict: "on" | "ahead" | "behind" = "on";
    if (expected !== null && Math.abs(actualChange - expected) > 0.3) {
      // 목표 방향(감량 = 음수)으로 더 갔으면 빠름.
      const sign = (change ?? 0) < 0 ? -1 : 1;
      verdict = (actualChange - expected) * sign > 0 ? "ahead" : "behind";
    }
    summary = { change: actualChange, verdict };
  }
  return { metric, weekly, monthly, summary };
}
