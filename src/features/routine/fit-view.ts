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
  if (!top || !part) return { text: "이번 주 목표 달성!", part: null };
  const label = BODY_PART_LABEL[part];
  return { text: `${label}${iGa(label)} 부족해요`, part };
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

// 2026-10-07: 균형 탭의 따로 된 결론(balanceHeadline)은 지웠다 — 같은 데이터로 추천은 "등", 균형은
// "어깨 옆"처럼 다른 말을 했다. 결론은 recommendHeadline(가장 빈 부위) 하나, 비율 경고는 균형 시트 안에서만.

/** 비율 카드가 어느 부위 아래에 들어가는지(균형 시트에서 그 부위를 고르면 같이 보여 준다). */
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

/** 오늘 맞춤 추천을 담은 날(YYYY-MM-DD)을 적는 쿠키 — 담은 뒤 다시 와도 또 담으라고 하지 않게. */
export const FIT_APPLIED_COOKIE = "fit-applied";

/* ── 한눈에(2026-10-07 한 화면 개편) ─────────────────────────────────── */

/** 레이더 축 순서 — 위(가슴)부터 시계 방향. 밀기(가슴·어깨·팔)와 나머지가 양쪽으로 갈린다. */
export const RADAR_ORDER: BodyPart[] = ["chest", "shoulder", "arm", "core", "lower", "back"];
/** 레이더 바깥 테두리 = 목표의 150%. 넘친 부위도 그 안에서 멈춘다. */
export const RADAR_MAX_PCT = 150;

/**
 * 부위 6개 레이더 좌표(중심 cx,cy · 바깥 반지름 r). 0%도 점이 안 겹치게 반지름 최소 4.
 * 반환: 실제 다각형 · 목표(100%) 다각형 · 바깥(150%) 다각형 · 축 끝(이름 자리).
 */
export function radarGeometry(
  parts: readonly { part: BodyPart; pct: number }[],
  cx = 100,
  cy = 100,
  r = 84,
): { actual: string; goal: string; outer: string; axes: { part: BodyPart; x: number; y: number; lx: number; ly: number }[] } {
  const pctOf = new Map(parts.map((p) => [p.part, p.pct]));
  const at = (i: number, radius: number) => {
    const a = ((-90 + 60 * i) * Math.PI) / 180;
    return { x: Math.round((cx + radius * Math.cos(a)) * 10) / 10, y: Math.round((cy + radius * Math.sin(a)) * 10) / 10 };
  };
  const poly = (radius: (i: number) => number) =>
    RADAR_ORDER.map((_, i) => at(i, radius(i)))
      .map((p) => `${p.x},${p.y}`)
      .join(" ");
  return {
    actual: poly((i) => Math.max(4, (Math.min(RADAR_MAX_PCT, pctOf.get(RADAR_ORDER[i]) ?? 0) / RADAR_MAX_PCT) * r)),
    goal: poly(() => (100 / RADAR_MAX_PCT) * r),
    outer: poly(() => r),
    axes: RADAR_ORDER.map((part, i) => {
      const end = at(i, r);
      const label = at(i, r + 14);
      return { part, x: end.x, y: end.y, lx: label.x, ly: label.y };
    }),
  };
}

/** 성장 타일 — 정체 종목이 있으면 그것(챙겨야 하니까), 아니면 가장 많이 오른 종목. */
export function growthTile<T extends { name: string; latestKg: number; stalled: boolean; series: { date: string; value: number }[] }>(
  rows: readonly T[],
): { name: string; kg: number; diffKg: number | null; stalled: boolean; points: number[] } | null {
  if (rows.length === 0) return null;
  const diff = (g: T) => (g.series.length >= 2 ? g.series[g.series.length - 1].value - g.series[0].value : 0);
  const pick = rows.find((g) => g.stalled) ?? [...rows].sort((a, b) => diff(b) - diff(a))[0];
  return {
    name: pick.name,
    kg: pick.latestKg,
    diffKg: pick.series.length >= 2 ? Math.round(diff(pick) * 10) / 10 : null,
    stalled: pick.stalled,
    points: pick.series.map((s) => s.value),
  };
}

/** 볼륨 짧게 — 4,800 → "4.8t", 950 → "950kg". */
export function shortVolume(kg: number): string {
  return kg >= 1000 ? `${(Math.round(kg / 100) / 10).toLocaleString("ko-KR")}t` : `${Math.round(kg).toLocaleString("ko-KR")}kg`;
}
