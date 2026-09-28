/** Shared running units for live, calendar, history and weekly summaries. */
export function formatRunDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  if (s < 60) return `${s}초`;
  const min = Math.floor(s / 60);
  if (min < 60) return `${min}분`;
  const h = Math.floor(min / 60);
  const rem = min % 60;
  return rem === 0 ? `${h}시간` : `${h}시간 ${rem}분`;
}

export function formatRunClock(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${String(m).padStart(2, "0")}:${ss}`;
}

export function formatRunPaceShort(secPerKm: number | null | undefined): string {
  if (!secPerKm || !Number.isFinite(secPerKm) || secPerKm <= 0) return "—";
  const total = Math.round(secPerKm);
  return `${Math.floor(total / 60)}'${String(total % 60).padStart(2, "0")}"`;
}

export function formatRunKcal(kcal: number | null | undefined): string {
  return kcal && kcal > 0 ? `${kcal}kcal` : "—";
}

export function formatRunKm(meters: number): string {
  return (meters / 1_000).toFixed(meters >= 100_000 ? 0 : meters >= 10_000 ? 1 : 2);
}
