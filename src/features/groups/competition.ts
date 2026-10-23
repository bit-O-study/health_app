/** Competition v1: activity points, not a medical fitness or calorie measure. */
import { weekRange } from "./ranking";

export type ScoreRecord = {
  id: string; user_id: string; for_date: string; status: string;
  sets?: number | null; reps?: number | null; set_details?: unknown;
  duration_min?: number | null;
};
export type PointBreakdown = { sets: number; reps: number; conditioning: number; attendance: number; total: number };
export const TIERS = [
  { name: "루키", icon: "🌱" }, { name: "브론즈", icon: "🥉" },
  { name: "실버", icon: "🥈" }, { name: "골드", icon: "🥇" },
  { name: "플래티넘", icon: "💠" }, { name: "다이아몬드", icon: "💎" },
] as const;
const bounded = (v: unknown, max: number) => typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(0, Math.floor(v))) : 0;
const empty = (): PointBreakdown => ({ sets: 0, reps: 0, conditioning: 0, attendance: 0, total: 0 });
const add = (a: PointBreakdown, b: PointBreakdown) => {
  for (const key of Object.keys(a) as (keyof PointBreakdown)[]) a[key] += b[key];
};

export function activityPoints(strength: ScoreRecord[], conditioning: ScoreRecord[], today: string) {
  const days = new Map<string, { sets: number; reps: number; minutes: number }>();
  const seen = new Set<string>();
  const valid = (r: ScoreRecord, kind: string) => {
    const key = `${kind}:${r.id}`;
    if (seen.has(key) || r.status !== "done" || !/^\d{4}-\d{2}-\d{2}$/.test(r.for_date) || r.for_date > today) return false;
    seen.add(key); return true;
  };
  const day = (date: string) => {
    if (!days.has(date)) days.set(date, { sets: 0, reps: 0, minutes: 0 });
    return days.get(date)!;
  };
  for (const r of strength) {
    if (!valid(r, "strength")) continue;
    const d = day(r.for_date);
    if (Array.isArray(r.set_details) && r.set_details.length) {
      for (const raw of r.set_details.slice(0, 20)) {
        const reps = bounded(raw?.reps, 100);
        if (reps > 0) { d.sets++; d.reps += reps; }
      }
    } else {
      const sets = bounded(r.sets, 20), reps = bounded(r.reps, 100);
      if (sets && reps) { d.sets += sets; d.reps += sets * reps; }
    }
  }
  for (const r of conditioning) {
    if (!valid(r, "conditioning")) continue;
    day(r.for_date).minutes += bounded(r.duration_min, 60);
  }
  const week = empty(), lifetime = empty(), currentDay = empty();
  const range = weekRange(today);
  for (const [date, d] of days) {
    const p = { sets: Math.min(120, d.sets * 4), reps: Math.min(60, Math.floor(d.reps / 5)),
      conditioning: Math.min(120, d.minutes * 2), attendance: d.sets || d.minutes ? 20 : 0, total: 0 };
    p.total = p.sets + p.reps + p.conditioning + p.attendance;
    add(lifetime, p);
    if (date >= range.from && date <= range.to) add(week, p);
    if (date === today) add(currentDay, p);
  }
  return { week, lifetime, today: currentDay };
}
export type League = { index: number; name: string; icon: string; eligibleFrom: string; lastResult: string | null; lastWeek: string | null };
export type Competitor = ReturnType<typeof activityPoints> & { userId: string; name: string; isMe: boolean; rank: number; league?: League; leagueGroupName?: string };
export function leagueZone(member: Competitor, members: Competitor[], weekFrom: string): "promotion" | "demotion" | "stay" | "placement" {
  if (!member.league || member.league.eligibleFrom > weekFrom) return "placement";
  const eligible = members.filter(m => m.league && m.league.eligibleFrom <= weekFrom);
  if (eligible.length < 3) return "stay";
  const slots = Math.max(1, Math.ceil(eligible.length * .2));
  if (member.week.total > 0 && eligible.filter(m => m.week.total >= member.week.total).length <= slots) return member.league.index < 5 ? "promotion" : "stay";
  if (member.week.total === 0 || eligible.filter(m => m.week.total <= member.week.total).length <= slots) return member.league.index > 0 ? "demotion" : "stay";
  return "stay";
}
export type CompetitionSnapshot = { groupId: string | null; weekFrom: string; today: string; members: Competitor[] };
export function rankCompetitors(members: Competitor[]): Competitor[] {
  const sorted = [...members].sort((a, b) => b.week.total - a.week.total || a.userId.localeCompare(b.userId));
  return sorted.map((m, i) => ({ ...m, rank: sorted.findIndex(p => p.week.total === m.week.total) + 1 || i + 1 }));
}
/** Only a strict crossing between existing members caused by the winner earning points. */
export function overtakes(before: CompetitionSnapshot, after: CompetitionSnapshot) {
  if (before.groupId !== after.groupId || before.weekFrom !== after.weekFrom) return [];
  const previous = new Map(before.members.map(m => [m.userId, m]));
  return after.members.flatMap(winner => {
    const old = previous.get(winner.userId);
    if (!old || winner.week.total <= old.week.total) return [];
    const passed = after.members.filter(loser => {
      const oldLoser = previous.get(loser.userId);
      return loser.userId !== winner.userId && oldLoser && old.week.total <= oldLoser.week.total && winner.week.total > loser.week.total;
    });
    return passed.length ? [{ winner, passed }] : [];
  });
}
