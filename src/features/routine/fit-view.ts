/**
 * 맞춤 운동 화면 문구·표시 규칙(2026-10-06 UI 개편) — 순수 로직.
 *
 * 숫자를 그대로 늘어놓지 않고 **화면 맨 위에 한 문장 결론**을 둔다. 세트는 0.5 단위,
 * 목표의 200%를 넘으면 숫자 대신 '넘침'(나쁜 게 아님), 균형 경고는 가장 큰 하나만 빨강.
 * 검수보고서: 맞춤 운동 탭 UI 검수보고서(2026-10-06).
 */

import { BODY_PART_LABEL, type BodyPart } from "@/features/routine/exercise-catalog-labels";
import type { BalanceRow, SubRow, SubStatus } from "@/features/routine/fit";

/** 세트 표시 — 0.5 단위 반올림. 3.6 → 3.5, 4.2 → 4, 0.6 → 0.5. */
export function roundSets(x: number): number {
  return Math.round(x * 2) / 2;
}

/** "3.5" · "4" — 정수면 소수점 없이. */
export function fmtSets(x: number): string {
  const r = roundSets(x);
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

/** 이 퍼센트를 넘으면 숫자 대신 '넘침'. */
export const OVER_PCT = 200;

/** 화면에 쓰는 상태 이름 — 많음(high)은 '넘침'으로, 나쁜 게 아니라는 뜻으로 회색. */
export const DISPLAY_LABEL: Record<SubStatus, string> = {
  none: "안 함",
  low: "부족",
  some: "조금",
  ok: "적정",
  high: "넘침",
};

/** 상태 칩 문구 — 넘친 곳은 숫자를 숨긴다(283% 같은 숫자가 '많이 하면 나쁜가'로 읽힌다). */
export function statusChip(status: SubStatus, pct: number): string {
  if (status === "high" || pct > OVER_PCT) return DISPLAY_LABEL.high;
  return `${DISPLAY_LABEL[status]} · ${pct}%`;
}

/** 세부 근육 id("back-lats") → 부위. */
export function partOfSub(sub: string): BodyPart | null {
  const p = sub.split("-")[0];
  return p in BODY_PART_LABEL ? (p as BodyPart) : null;
}

/** 을/를 — 받침 있으면 '을'. */
function eulReul(word: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 !== 0 ? "을" : "를";
}

/** 이/가 — 받침 있으면 '이'. */
export function iGa(word: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 !== 0 ? "이" : "가";
}

/**
 * 오늘 추천 결론 — 가장 모자란 세부 근육의 부위로 한 문장.
 * 모자란 곳이 없으면 다 채웠다고 말한다.
 */
export function recommendHeadline(lacking: readonly SubRow[]): { text: string; part: BodyPart | null } {
  const top = lacking[0];
  const part = top ? partOfSub(top.sub) : null;
  if (!top || !part) return { text: "이번 주 목표를 다 채웠어요", part: null };
  const label = BODY_PART_LABEL[part];
  return { text: `이번 주는 ${label}${iGa(label)} 가장 모자라요`, part };
}

/** 추천 버튼 문구 — "오늘 운동에 2개 더하기". */
export function addLabel(n: number): string {
  return `오늘 운동에 ${n}개 더하기`;
}

/** 부위 요약을 모자란 순(퍼센트 낮은 순)으로. */
export function sortPartsByNeed<T extends { pct: number }>(parts: readonly T[]): T[] {
  return [...parts].sort((a, b) => a.pct - b.pct);
}

/**
 * 가장 큰 불균형 하나 — 목표 비율과 지금 비율 차이가 가장 큰 칸. 5%p 이내면 없음.
 * 화면은 이것만 빨강, 나머지 안내는 회색으로 낮춘다(전부 빨갛면 뭐가 급한지 모른다).
 */
export function worstBalance(rows: readonly BalanceRow[]): { id: string; part: string; now: number; goal: number; gap: number } | null {
  let best: { id: string; part: string; now: number; goal: number; gap: number } | null = null;
  for (const r of rows) {
    if (r.parts.every((p) => p.now === 0)) continue;
    for (const p of r.parts) {
      const gap = p.goal - p.now;
      if (gap > 5 && (!best || gap > best.gap)) best = { id: r.id, part: p.label, now: p.now, goal: p.goal, gap };
    }
  }
  return best;
}

/** 균형 칸 이름 앞에 붙는 부위('옆'만으로는 어디인지 모른다 → '어깨 옆'). */
const BALANCE_PREFIX: Record<string, string> = { "push-pull": "", shoulder: "어깨 ", chest: "가슴 ", triceps: "삼두 ", legs: "하체 " };

/** 내 몸 균형 결론 — 가장 큰 불균형 한 줄. 없으면 고르게 하고 있다고. */
export function balanceHeadline(rows: readonly BalanceRow[]): string {
  const w = worstBalance(rows);
  if (!w) return "지금은 고르게 하고 있어요";
  return `${BALANCE_PREFIX[w.id] ?? ""}${w.part} 쪽이 가장 모자라요 — 지금 ${w.now}%, 목표 ${w.goal}%`;
}

/** 균형 카드가 어느 부위 아래에 들어가는지(펼친 부위 안에서 같이 보여 준다). */
export const BALANCE_PART: Record<string, BodyPart> = {
  "push-pull": "back",
  shoulder: "shoulder",
  chest: "chest",
  triceps: "arm",
  legs: "lower",
};

/** 성장 추이 양끝 — "9/6 88kg → 10/4 101kg". 점이 하나면 null. */
export function growthEnds(series: readonly { date: string; value: number }[]): { from: string; to: string; diffKg: number } | null {
  if (series.length < 2) return null;
  const a = series[0];
  const b = series[series.length - 1];
  const md = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;
  const kg = (v: number) => `${Math.round(v * 10) / 10}kg`;
  return { from: `${md(a.date)} ${kg(a.value)}`, to: `${md(b.date)} ${kg(b.value)}`, diffKg: Math.round((b.value - a.value) * 10) / 10 };
}

/** 지난달 대비 화살표 — ▲ 3 · ▼ 2 · 같음. */
export function deltaMark(now: number, prev: number): { mark: "up" | "down" | "same"; diff: number } {
  const diff = Math.round((now - prev) * 10) / 10;
  return { mark: diff > 0 ? "up" : diff < 0 ? "down" : "same", diff: Math.abs(diff) };
}

/** 받침에 맞춘 '을/를' 을 붙인 부위 이름(리포트 문장용). */
export function partWithEulReul(part: BodyPart): string {
  const label = BODY_PART_LABEL[part];
  return `${label}${eulReul(label)}`;
}
