/**
 * 런닝 기록 화면(B안) — 순수 표시 로직. 날짜·시간 표기, 월 요약·지난달 대비, 주 단위 묶음.
 * 서버/클라이언트 어디서든 쓰고 단위테스트한다(tests/be/logic/run-records-view.test.ts).
 */
import { runWeekBounds, type RunHistoryRow } from "@/features/running/run-history-summary";

const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];
const MONTH_RE = /^(20\d{2})-(0[1-9]|1[0-2])$/;

function ymdParts(ymd: string): [number, number, number] {
  const [y, m, d] = ymd.split("-").map(Number);
  return [y, m, d];
}

function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymdParts(ymd);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** "2026-09-27" → "9월 27일 (일)". 화면에 ISO 날짜를 쓰지 않는다. */
export function formatRunDate(ymd: string): string {
  const [y, m, d] = ymdParts(ymd);
  const weekday = WEEKDAY[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${m}월 ${d}일 (${weekday})`;
}

/** 목록·요약용 시간 — "30분", "4시간 18분", 1분 미만은 "45초". */
export function formatRunDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  if (s < 60) return `${s}초`;
  const min = Math.floor(s / 60);
  if (min < 60) return `${min}분`;
  const h = Math.floor(min / 60);
  const rem = min % 60;
  return rem === 0 ? `${h}시간` : `${h}시간 ${rem}분`;
}

/** 상세용 시간 — "30:02", "1:02:03". */
export function formatRunClock(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/** 페이스 — 초/km → "6'04\"". 값이 없으면 "—". */
export function formatRunPaceShort(secPerKm: number | null | undefined): string {
  if (!secPerKm || !Number.isFinite(secPerKm) || secPerKm <= 0) return "—";
  const total = Math.round(secPerKm);
  return `${Math.floor(total / 60)}'${String(total % 60).padStart(2, "0")}"`;
}

/** 0 이하 값은 "—" — 0kcal 처럼 없는 값을 0 으로 보여주지 않는다. */
export function formatRunKcal(kcal: number | null | undefined): string {
  return kcal && kcal > 0 ? `${kcal}kcal` : "—";
}

export function formatRunKm(meters: number): string {
  return (meters / 1_000).toFixed(meters >= 100_000 ? 0 : meters >= 10_000 ? 1 : 2);
}

export function monthOf(ymd: string): string {
  return ymd.slice(0, 7);
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

/** 주소의 ?m= 을 해석 — 형식이 틀리거나 이번 달보다 뒤면 이번 달. */
export function resolveRunMonth(requested: string | undefined, todayYmd: string): string {
  const current = monthOf(todayYmd);
  if (!requested || !MONTH_RE.test(requested)) return current;
  return requested > current ? current : requested;
}

export function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, "0")}` };
}

export type RunTotals = {
  sessions: number;
  distanceM: number;
  durationSec: number;
  paceSecPerKm: number | null;
};

export function summarizeRuns(rows: Pick<RunHistoryRow, "distanceM" | "durationSec">[]): RunTotals {
  const distanceM = rows.reduce((sum, r) => sum + r.distanceM, 0);
  const durationSec = rows.reduce((sum, r) => sum + r.durationSec, 0);
  return {
    sessions: rows.length,
    distanceM,
    durationSec,
    paceSecPerKm: distanceM > 0 ? Math.round(durationSec / (distanceM / 1_000)) : null,
  };
}

export type RunDeltaTrend = "up" | "down" | "flat";

/** 지난달 대비 문구. 두 달 모두 0이면 null(표시 안 함). 비교할 게 없거나 비슷하면 화살표 없는 "flat". */
export function runMonthDelta(currentM: number, previousM: number): { text: string; trend: RunDeltaTrend } | null {
  if (currentM <= 0 && previousM <= 0) return null;
  if (previousM <= 0) return { text: "지난달 기록 없음", trend: "flat" };
  const diff = currentM - previousM;
  if (Math.abs(diff) < 50) return { text: "지난달과 비슷해요", trend: "flat" };
  return {
    text: `지난달보다 ${formatRunKm(Math.abs(diff))}km ${diff > 0 ? "더" : "덜"}`,
    trend: diff > 0 ? "up" : "down",
  };
}

export type RunWeekBar = {
  from: string;
  to: string;
  label: string;
  distanceM: number;
  current: boolean;
  future: boolean;
};

/** 달에 걸친 월요일 시작 주 — 주별 막대용. 달 밖의 날은 그 달 기록만 센다. */
export function runMonthWeeks(month: string, rows: Pick<RunHistoryRow, "forDate" | "distanceM">[], todayYmd: string): RunWeekBar[] {
  const { from, to } = monthRange(month);
  const thisWeek = runWeekBounds(todayYmd);
  const weeks: RunWeekBar[] = [];
  let start = runWeekBounds(from).from;
  let index = 1;
  while (start <= to) {
    const end = addDays(start, 6);
    const lo = start < from ? from : start;
    const hi = end > to ? to : end;
    const current = thisWeek.from === start;
    weeks.push({
      from: lo,
      to: hi,
      label: current ? "이번 주" : `${index}주`,
      distanceM: rows.filter((r) => r.forDate >= lo && r.forDate <= hi).reduce((s, r) => s + r.distanceM, 0),
      current,
      future: lo > todayYmd,
    });
    start = addDays(start, 7);
    index += 1;
  }
  return weeks;
}

function shortMd(ymd: string): string {
  const [, m, d] = ymdParts(ymd);
  return `${m}/${d}`;
}

export type RunWeekGroup<T> = { key: string; label: string; distanceM: number; rows: T[] };

/** 목록을 월요일 시작 주로 묶는다(입력 순서 유지 — 최신순이면 최신 주가 먼저). */
export function groupRunsByWeek<T extends Pick<RunHistoryRow, "forDate" | "distanceM">>(rows: T[], todayYmd: string): RunWeekGroup<T>[] {
  const thisWeek = runWeekBounds(todayYmd).from;
  const groups = new Map<string, RunWeekGroup<T>>();
  for (const row of rows) {
    const from = runWeekBounds(row.forDate).from;
    let group = groups.get(from);
    if (!group) {
      const to = addDays(from, 6);
      const range = `${shortMd(from)}–${shortMd(to)}`;
      group = { key: from, label: from === thisWeek ? `이번 주 · ${range}` : range, distanceM: 0, rows: [] };
      groups.set(from, group);
    }
    group.rows.push(row);
    group.distanceM += row.distanceM;
  }
  return [...groups.values()];
}
