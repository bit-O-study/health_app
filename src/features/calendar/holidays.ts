/**
 * 대한민국 공휴일 + 복날(삼복) — 연도별로 자동 계산하는 순수 모듈(테스트 가능).
 *
 * 음력 공휴일(설날·추석·부처님오신날)과 절기 기반 복날(초복·중복·말복)은
 * `lunar-javascript`로 계산하고, 고정 공휴일·대체공휴일은 규칙으로 만든다.
 * → 매년 표를 손으로 넣을 필요 없이 어느 연도든 자동 산출된다.
 *
 * 정밀 법률 자문이 아니라 캘린더 표시용. 임시공휴일(정부 수시 지정)은 자동 산출이
 * 불가능해 MANUAL_HOLIDAYS로 보완한다.
 */

import KoreanLunarCalendar from "korean-lunar-calendar";
import { Solar } from "lunar-javascript";

export type DayMarkKind = "holiday" | "bok";
export type DayMark = { name: string; kind: DayMarkKind };

/** 정부가 수시로 지정하는 임시공휴일 등 자동 산출 불가 항목. 확정되면 추가. */
const MANUAL_HOLIDAYS: Record<string, string> = {
  "2025-01-27": "임시공휴일", // 2025 설 연휴 임시공휴일
};

const pad = (n: number) => String(n).padStart(2, "0");
const toYmd = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d) + n * 86_400_000);
  return toYmd(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

/** 요일: 0=일 … 6=토. */
function dow(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

// 음력→양력: 한국 공식(KASI) 음력 기준. 중국 음력과 1일 차이나는 해가 있어 한국용을 쓴다.
const lunarToSolar = (y: number, m: number, d: number): string => {
  const cal = new KoreanLunarCalendar();
  cal.setLunarDate(y, m, d, false);
  const s = cal.getSolarCalendar();
  return toYmd(s.year, s.month, s.day);
};

/** 그 날의 일간(干)이 庚(인덱스 6)인지 — 복날(경일) 판정용. */
function isGeng(ymd: string): boolean {
  const [y, m, d] = ymd.split("-").map(Number);
  return Solar.fromYmd(y, m, d).getLunar().getDayGanIndex() === 6;
}

/** 그 해의 절기(夏至/立秋 등) 양력 날짜. */
function jieqi(year: number, name: string): string {
  const table = Solar.fromYmd(year, 7, 1).getLunar().getJieQiTable();
  return table[name].toYmd();
}

/** start(포함)부터 n번째 경일(庚日). */
function nthGeng(start: string, n: number): string {
  let d = start;
  let count = 0;
  for (let i = 0; i < 400; i++) {
    if (isGeng(d)) {
      count++;
      if (count === n) return d;
    }
    d = addDays(d, 1);
  }
  return start; // 도달 불가(이론상 없음)
}

type Built = { holidays: Record<string, string>; bok: Record<string, string> };
const cache = new Map<number, Built>();

type Group = "seol" | "chuseok" | "normal" | "none";
type Occ = { date: string; name: string; group: Group };

function buildYear(year: number): Built {
  const cached = cache.get(year);
  if (cached) return cached;

  // ── 기본 공휴일(대체 산정 메타 포함). group: 대체공휴일 규칙 구분.
  //    normal = 토·일·중복 시 대체 / seol·chuseok = 일요일·중복만 / none = 대체 없음
  const occ: Occ[] = [
    { date: toYmd(year, 1, 1), name: "신정", group: "none" },
    { date: toYmd(year, 3, 1), name: "삼일절", group: "normal" },
    { date: toYmd(year, 5, 5), name: "어린이날", group: "normal" },
    { date: toYmd(year, 6, 6), name: "현충일", group: "none" },
    { date: toYmd(year, 8, 15), name: "광복절", group: "normal" },
    { date: toYmd(year, 10, 3), name: "개천절", group: "normal" },
    { date: toYmd(year, 10, 9), name: "한글날", group: "normal" },
    { date: toYmd(year, 12, 25), name: "성탄절", group: "normal" },
    { date: lunarToSolar(year, 4, 8), name: "부처님오신날", group: "normal" },
  ];
  // 제헌절: 2026년부터 다시 공휴일(2026.5.11 시행).
  if (year >= 2026) {
    occ.push({ date: toYmd(year, 7, 17), name: "제헌절", group: "normal" });
  }
  // 설날·추석 연휴(전날·당일·다음날).
  const seol = lunarToSolar(year, 1, 1);
  for (const off of [-1, 0, 1]) {
    occ.push({ date: addDays(seol, off), name: "설날", group: "seol" });
  }
  const chuseok = lunarToSolar(year, 8, 15);
  for (const off of [-1, 0, 1]) {
    occ.push({ date: addDays(chuseok, off), name: "추석", group: "chuseok" });
  }

  const holidays: Record<string, string> = {};
  for (const o of occ) if (!holidays[o.date]) holidays[o.date] = o.name;
  for (const [d, n] of Object.entries(MANUAL_HOLIDAYS)) {
    if (d.startsWith(`${year}-`)) holidays[d] = n;
  }

  // ── 대체공휴일
  const baseDates = new Set(Object.keys(holidays));
  const usedSub = new Set<string>();
  const placeAfter = (anchor: string) => {
    let d = addDays(anchor, 1);
    while (dow(d) === 0 || dow(d) === 6 || baseDates.has(d) || usedSub.has(d)) {
      d = addDays(d, 1);
    }
    usedSub.add(d);
    baseDates.add(d);
    holidays[d] = "대체공휴일";
  };

  // normal: 한 날짜에 N개면 평일은 (N-1)개, 주말이면 N개 대체.
  const normalByDate = new Map<string, number>();
  for (const o of occ) {
    if (o.group === "normal") {
      normalByDate.set(o.date, (normalByDate.get(o.date) ?? 0) + 1);
    }
  }
  for (const [date, count] of [...normalByDate].sort((a, b) =>
    a[0] < b[0] ? -1 : 1,
  )) {
    const weekend = dow(date) === 0 || dow(date) === 6;
    const needed = weekend ? count : count - 1;
    for (let i = 0; i < needed; i++) placeAfter(date);
  }

  // 설·추석 연휴: 일요일과 겹친 날 수만큼 연휴 다음에 대체.
  for (const grp of ["seol", "chuseok"] as const) {
    const days = occ
      .filter((o) => o.group === grp)
      .map((o) => o.date)
      .sort();
    if (days.length === 0) continue;
    const needed = days.filter((d) => dow(d) === 0).length;
    const last = days[days.length - 1];
    for (let i = 0; i < needed; i++) placeAfter(last);
  }

  // ── 복날(삼복)
  const bok: Record<string, string> = {};
  const chobok = nthGeng(jieqi(year, "夏至"), 3); // 하지 후 셋째 경일
  const jungbok = addDays(chobok, 10); // 넷째 경일
  const malbok = nthGeng(jieqi(year, "立秋"), 1); // 입추 후 첫째 경일
  bok[chobok] = "초복";
  bok[jungbok] = "중복";
  bok[malbok] = "말복";

  const built: Built = { holidays, bok };
  cache.set(year, built);
  return built;
}

const yearOf = (ymd: string) => Number(ymd.slice(0, 4));

/** 해당 날짜의 표시 마크(공휴일·복날). 없으면 빈 배열. */
export function getDayMarks(dateYmd: string): DayMark[] {
  const { holidays, bok } = buildYear(yearOf(dateYmd));
  const out: DayMark[] = [];
  if (holidays[dateYmd]) out.push({ name: holidays[dateYmd], kind: "holiday" });
  if (bok[dateYmd]) out.push({ name: bok[dateYmd], kind: "bok" });
  return out;
}

/** 공휴일이면 true(날짜 숫자를 빨갛게 칠하는 용도). */
export function isHoliday(dateYmd: string): boolean {
  return Boolean(buildYear(yearOf(dateYmd)).holidays[dateYmd]);
}
