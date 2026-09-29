/**
 * 캘린더 이름표 — 순수 로직(2단계, 2026-09-29).
 *
 * 예전 주간 머리글은 "2026-09-28 ~ 2026-10-04" 원문 날짜였고, 요약 제목은 지난주·지난달을
 * 봐도 늘 "이번 주 요약"·"이번 달 요약" 이었다. 사람이 말하는 식으로 바꾼다.
 */

import { shiftYmd, weekStartYmd } from "@/features/routine/progress";

const ORDINAL = ["첫째", "둘째", "셋째", "넷째", "다섯째"] as const;

const parts = (ymd: string) => ymd.split("-").map(Number) as [number, number, number];

/**
 * "9월 넷째 주" — 그 주의 **목요일**이 속한 달·순서로 센다(ISO 주차와 같은 규칙).
 * 월말·월초에 걸친 주가 두 달에 중복되지 않는다.
 */
export function weekOfMonthLabel(weekFrom: string): string {
  const thursday = shiftYmd(weekStartYmd(weekFrom), 3);
  const [, m, d] = parts(thursday);
  return `${m}월 ${ORDINAL[Math.ceil(d / 7) - 1] ?? `${Math.ceil(d / 7)}번째`} 주`;
}

/** "9/28–10/4" */
export function rangeLabel(from: string, to: string): string {
  const [, fm, fd] = parts(from);
  const [, tm, td] = parts(to);
  return `${fm}/${fd}–${tm}/${td}`;
}

/** 주간 머리글 — "9월 넷째 주 · 9/28–10/4". */
export function weekTitle(from: string, to: string): string {
  return `${weekOfMonthLabel(from)} · ${rangeLabel(from, to)}`;
}

/**
 * 요약 카드 제목 — 보고 있는 기간이 언제인지 그대로.
 *  - 주: 이번 주 / 지난 주 / 다음 주 / "9월 첫째 주"
 *  - 달: 이번 달 / 지난 달 / "8월" / "2025년 12월"
 */
export function summaryTitle(
  o: { kind: "week"; from: string } | { kind: "month"; year: number; month1: number },
  today: string,
): string {
  if (o.kind === "week") {
    const thisWeek = weekStartYmd(today);
    const from = weekStartYmd(o.from);
    if (from === thisWeek) return "이번 주 요약";
    if (from === shiftYmd(thisWeek, -7)) return "지난 주 요약";
    if (from === shiftYmd(thisWeek, 7)) return "다음 주 요약";
    return `${weekOfMonthLabel(from)} 요약`;
  }
  const [ty, tm] = parts(today);
  if (o.year === ty && o.month1 === tm) return "이번 달 요약";
  const prevY = tm === 1 ? ty - 1 : ty;
  const prevM = tm === 1 ? 12 : tm - 1;
  if (o.year === prevY && o.month1 === prevM) return "지난 달 요약";
  return o.year === ty ? `${o.month1}월 요약` : `${o.year}년 ${o.month1}월 요약`;
}

/** 런닝 거리 "5.2km" / 1km 미만은 "850m". */
export function distanceLabel(meters: number): string {
  if (!(meters > 0)) return "0m";
  if (meters < 1000) return `${Math.round(meters)}m`;
  const km = meters / 1000;
  return `${km >= 10 ? km.toFixed(1) : km.toFixed(1).replace(/\.0$/, "")}km`;
}

/** 페이스 "5'30\"/km". 없으면 "—". */
export function paceLabel(secPerKm: number | null | undefined): string {
  if (!secPerKm || !Number.isFinite(secPerKm) || secPerKm <= 0) return "—";
  const s = Math.round(secPerKm);
  return `${Math.floor(s / 60)}'${String(s % 60).padStart(2, "0")}"/km`;
}

/** 시간 "32분" / "1시간 5분". */
export function durationLabel(sec: number): string {
  if (!(sec > 0)) return "0분";
  const m = Math.round(sec / 60);
  if (m < 60) return `${m}분`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? `${h}시간` : `${h}시간 ${r}분`;
}

/** 시각(ISO, UTC) → 한국 날짜 "YYYY-MM-DD". 체중처럼 날짜 칸 없이 시각만 저장된 기록용. */
export function seoulDateOf(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  return new Date(t + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

/** 한국 날짜 하루(00:00~24:00 KST)를 UTC 시각 범위로 — created_at 조회용. */
export function seoulDayRangeUtc(from: string, to: string): { gte: string; lt: string } {
  return {
    gte: new Date(Date.parse(`${from}T00:00:00+09:00`)).toISOString(),
    lt: new Date(Date.parse(`${shiftYmd(to, 1)}T00:00:00+09:00`)).toISOString(),
  };
}

/** 날짜 상세의 앞뒤 날짜. */
export function adjacentDays(date: string): { prev: string; next: string } {
  return { prev: shiftYmd(date, -1), next: shiftYmd(date, 1) };
}
