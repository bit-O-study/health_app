/**
 * 행동 다짐 판정 — 시작일부터 7일씩 끊어 체크한다(2026-10-06). 순수 로직.
 *
 * - 구간 i = [시작 + 7i, 시작 + 7i + 6]. 마지막 구간은 짧을 수 있다(30일 = 7×4 + 2).
 * - 구간이 끝난 **다음날 00:00** 에 그 구간을 판정한다. 그 전까지는 빈 날을 채울 수 있다.
 * - 하나라도 어기면 그 즉시 다짐 전체가 실패. 모든 구간을 통과하면 성공.
 * - 주 N회 목표는 짧은 구간에선 일수에 비례해 줄인다(올림): 주 4일 × 2/7 → 2일.
 * - 식단: 매일 고른 끼니 수만큼 기록돼야 한다. kcal·단백질은 7일 평균으로 본다.
 */

import type { BodyPart } from "@/features/routine/exercise-catalog-labels";
import { BODY_PART_LABEL } from "@/features/routine/exercise-catalog-labels";
import type { PledgeSpec } from "@/features/commitments/pledge";

export const BLOCK_DAYS = 7;

/** 하루치 기록 — data-access 가 채운다. */
export type PledgeDay = {
  /** 운동 소모 kcal(근력 + 유산소). */
  burnKcal: number;
  workedOut: boolean;
  /** 근력운동을 했는가. */
  strength: boolean;
  /** 그날 근력운동이 닿은 부위. */
  strengthParts: BodyPart[];
  cardioMin: number;
  steps: number;
  intakeKcal: number;
  proteinG: number;
  /** 기록된 서로 다른 끼니 수(아침·점심·저녁·간식). '안 먹었어요'는 세지 않는다. */
  mealCount: number;
};

export const EMPTY_PLEDGE_DAY: PledgeDay = {
  burnKcal: 0,
  workedOut: false,
  strength: false,
  strengthParts: [],
  cardioMin: 0,
  steps: 0,
  intakeKcal: 0,
  proteinG: 0,
  mealCount: 0,
};

export type FailReason =
  | "workout_short"
  | "strength_short"
  | "cardio_short"
  | "steps_short"
  | "diet_missing"
  | "intake_over"
  | "intake_under"
  | "protein_short";

export type ProgressItem = {
  key: string;
  reason: FailReason;
  label: string;
  /** 지금까지 채운 값. */
  have: number;
  /** 이 구간에서 필요한 값. */
  need: number;
  unit: string;
  /** atmost = 이하여야 통과(섭취 상한). */
  dir: "atleast" | "atmost";
  ok: boolean;
};

export type BlockResult = {
  index: number;
  start: string;
  end: string;
  days: number;
  /** 판정 시각(이 날짜 00:00). */
  checkAt: string;
  closed: boolean;
  items: ProgressItem[];
  /** 끼니 수가 모자란 날(오늘 이전, 이 구간 안). */
  missingDietDates: string[];
  failed: boolean;
};

export type PledgeStatus = "upcoming" | "active" | "success" | "failed";

export type PledgeEval = {
  status: PledgeStatus;
  endDate: string;
  blocks: BlockResult[];
  /** 지금 진행 중인 구간(시작 전·끝났으면 null). */
  current: BlockResult | null;
  /** 실패한 구간과 이유. */
  failedBlock: BlockResult | null;
  /** 판정이 확정된 날(실패·성공). */
  decidedOn: string | null;
};

export function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

export function dayDiff(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

export function pledgeEndDate(startDate: string, days: number): string {
  return addDays(startDate, days - 1);
}

/** 구간 경계들. */
export function pledgeBlocks(
  startDate: string,
  days: number,
): { index: number; start: string; end: string; days: number }[] {
  const out = [];
  for (let i = 0, off = 0; off < days; i++, off += BLOCK_DAYS) {
    const len = Math.min(BLOCK_DAYS, days - off);
    out.push({ index: i, start: addDays(startDate, off), end: addDays(startDate, off + len - 1), days: len });
  }
  return out;
}

/** 주 N회 → 이 구간 길이에 맞춘 목표(올림). */
export function scaledPerWeek(perWeek: number, blockDays: number): number {
  return Math.ceil((perWeek * blockDays) / BLOCK_DAYS);
}

const avg = (xs: number[]) => (xs.length === 0 ? 0 : xs.reduce((s, v) => s + v, 0) / xs.length);

/**
 * 한 구간 판정. `upTo` 는 지금까지 본 마지막 날(오늘) — 진행 중 구간의 '지금까지' 값을 낸다.
 * 닫힌 구간은 구간 전체를 본다.
 */
export function evaluateBlock(
  p: PledgeSpec,
  block: { index: number; start: string; end: string; days: number },
  dayOf: (ymd: string) => PledgeDay,
  today: string,
): BlockResult {
  const checkAt = addDays(block.end, 1);
  const closed = today >= checkAt;
  const dates: string[] = [];
  for (let i = 0; i < block.days; i++) dates.push(addDays(block.start, i));
  const seen = dates.filter((d) => closed || d <= today);
  const daysData = seen.map(dayOf);
  const items: ProgressItem[] = [];

  if (p.workoutDays !== undefined) {
    const need = scaledPerWeek(p.workoutDays, block.days);
    const have = daysData.filter((d) =>
      p.burnKcal !== undefined ? d.burnKcal >= p.burnKcal : d.workedOut,
    ).length;
    items.push({
      key: "workout",
      reason: "workout_short",
      label: p.burnKcal !== undefined ? `${p.burnKcal.toLocaleString()}kcal 이상 소모한 날` : "운동한 날",
      have,
      need,
      unit: "일",
      dir: "atleast",
      ok: have >= need,
    });
  }
  for (const s of p.strength ?? []) {
    const need = scaledPerWeek(s.perWeek, block.days);
    const have = daysData.filter((d) =>
      s.part === "any" ? d.strength : d.strengthParts.includes(s.part as BodyPart),
    ).length;
    items.push({
      key: `strength:${s.part}`,
      reason: "strength_short",
      label: s.part === "any" ? "근력운동" : `${BODY_PART_LABEL[s.part as BodyPart]} 운동`,
      have,
      need,
      unit: "회",
      dir: "atleast",
      ok: have >= need,
    });
  }
  if (p.cardioMinWeek !== undefined) {
    const need = Math.round((p.cardioMinWeek * block.days) / BLOCK_DAYS);
    const have = Math.round(daysData.reduce((s, d) => s + d.cardioMin, 0));
    items.push({ key: "cardio", reason: "cardio_short", label: "유산소", have, need, unit: "분", dir: "atleast", ok: have >= need });
  }
  if (p.steps) {
    const need = scaledPerWeek(p.steps.perWeek, block.days);
    const have = daysData.filter((d) => d.steps >= p.steps!.steps).length;
    items.push({
      key: "steps",
      reason: "steps_short",
      label: `${p.steps.steps.toLocaleString()}보 걸은 날`,
      have,
      need,
      unit: "일",
      dir: "atleast",
      ok: have >= need,
    });
  }

  // 식단 — 끼니 수는 매일. 오늘은 아직 진행 중이라 '모자란 날'에서 뺀다.
  const missingDietDates: string[] = [];
  if (p.mealsPerDay !== undefined) {
    for (const d of seen) {
      if ((closed || d < today) && dayOf(d).mealCount < p.mealsPerDay) missingDietDates.push(d);
    }
    const loggedDays = seen.filter((d) => dayOf(d).mealCount >= p.mealsPerDay!).length;
    items.push({
      key: "meals",
      reason: "diet_missing",
      label: `하루 ${p.mealsPerDay}끼 기록한 날`,
      have: loggedDays,
      need: block.days,
      unit: "일",
      dir: "atleast",
      ok: closed ? missingDietDates.length === 0 : true,
    });
  }
  // kcal·단백질 평균은 기록이 있는 날로 낸다(빈 날은 위 '끼니' 규칙이 잡는다).
  const fed = daysData.filter((d) => d.mealCount > 0);
  if (p.intakeMax !== undefined) {
    const have = Math.round(avg(fed.map((d) => d.intakeKcal)));
    items.push({ key: "intakeMax", reason: "intake_over", label: "하루 평균 섭취", have, need: p.intakeMax, unit: "kcal", dir: "atmost", ok: have <= p.intakeMax });
  }
  if (p.intakeMin !== undefined) {
    const have = Math.round(avg(fed.map((d) => d.intakeKcal)));
    items.push({ key: "intakeMin", reason: "intake_under", label: "하루 평균 섭취", have, need: p.intakeMin, unit: "kcal", dir: "atleast", ok: have >= p.intakeMin });
  }
  if (p.proteinG !== undefined) {
    const have = Math.round(avg(fed.map((d) => d.proteinG)));
    items.push({ key: "protein", reason: "protein_short", label: "하루 평균 단백질", have, need: p.proteinG, unit: "g", dir: "atleast", ok: have >= p.proteinG });
  }

  return {
    ...block,
    checkAt,
    closed,
    items,
    missingDietDates,
    failed: closed && items.some((i) => !i.ok),
  };
}

/** 다짐 전체 판정. */
export function evaluatePledge(
  p: PledgeSpec,
  startDate: string,
  dayOf: (ymd: string) => PledgeDay,
  today: string,
): PledgeEval {
  const endDate = pledgeEndDate(startDate, p.days);
  const blocks = pledgeBlocks(startDate, p.days).map((b) => evaluateBlock(p, b, dayOf, today));
  const failedBlock = blocks.find((b) => b.failed) ?? null;
  if (failedBlock) {
    return { status: "failed", endDate, blocks, current: null, failedBlock, decidedOn: failedBlock.checkAt };
  }
  if (today < startDate) {
    return { status: "upcoming", endDate, blocks, current: null, failedBlock: null, decidedOn: null };
  }
  if (blocks.every((b) => b.closed)) {
    return { status: "success", endDate, blocks, current: null, failedBlock: null, decidedOn: addDays(endDate, 1) };
  }
  const current = blocks.find((b) => !b.closed) ?? null;
  return { status: "active", endDate, blocks, current, failedBlock: null, decidedOn: null };
}

export const FAIL_REASON_LABEL: Record<FailReason, string> = {
  workout_short: "운동일 부족",
  strength_short: "근력운동 부족",
  cardio_short: "유산소 부족",
  steps_short: "걸음 수 부족",
  diet_missing: "식단 기록 누락",
  intake_over: "섭취 상한 초과",
  intake_under: "섭취 하한 미달",
  protein_short: "단백질 부족",
};

/** 실패 사유 문구(카드·결과 테이블). */
export function failReasons(block: BlockResult): FailReason[] {
  return [...new Set(block.items.filter((i) => !i.ok).map((i) => i.reason))];
}

/** "10/8 · 10/9" — 현황 화면 경고 문구용. */
export function shortDates(dates: string[]): string {
  return dates.map((d) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`).join(" · ");
}
