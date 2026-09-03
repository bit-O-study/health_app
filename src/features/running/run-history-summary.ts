import type { RunningMode } from "@/features/running/run-session";

export type RunHistoryRow = {
  id: string;
  forDate: string;
  mode: RunningMode;
  startedAt: string;
  durationSec: number;
  distanceM: number;
  avgKmh: number;
  paceSecPerKm: number | null;
  caloriesKcal: number;
  averageHeartRate: number | null;
  maxHeartRate: number | null;
  heartRateSampleCount: number;
  incline: number | null;
  routePointCount: number;
};

export type RunWeekSummary = {
  from: string;
  to: string;
  sessions: number;
  durationSec: number;
  distanceM: number;
  caloriesKcal: number;
};

function addDays(ymd: string, days: number): string {
  const [year, month, day] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

export function runWeekBounds(todayYmd: string): { from: string; to: string } {
  const [year, month, day] = todayYmd.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  return { from: addDays(todayYmd, mondayOffset), to: todayYmd };
}

export function summarizeRunWeek(
  rows: RunHistoryRow[],
  todayYmd: string,
): RunWeekSummary {
  const { from, to } = runWeekBounds(todayYmd);
  const inWeek = rows.filter((row) => row.forDate >= from && row.forDate <= to);
  return {
    from,
    to,
    sessions: inWeek.length,
    durationSec: inWeek.reduce((sum, row) => sum + row.durationSec, 0),
    distanceM: inWeek.reduce((sum, row) => sum + row.distanceM, 0),
    caloriesKcal: inWeek.reduce((sum, row) => sum + row.caloriesKcal, 0),
  };
}

export function formatRunPace(paceSecPerKm: number | null): string {
  if (!paceSecPerKm || paceSecPerKm <= 0) return "—";
  const min = Math.floor(paceSecPerKm / 60);
  const sec = Math.round(paceSecPerKm % 60);
  return `${min}'${String(sec).padStart(2, "0")}\"/km`;
}
