import { shiftYmd, weekStartYmd } from "@/features/routine/progress";
export function calendarWeek(anchor: string | undefined, today: string) {
  let date = today;
  if (anchor && /^\d{4}-\d{2}-\d{2}$/.test(anchor)) {
    const parsed = new Date(anchor + "T00:00:00Z");
    if (Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === anchor) date = anchor;
  }
  const from = weekStartYmd(date);
  return { from, to: shiftYmd(from, 6), dates: Array.from({ length: 7 }, (_, i) => shiftYmd(from, i)), previous: shiftYmd(from, -7), next: shiftYmd(from, 7) };
}
