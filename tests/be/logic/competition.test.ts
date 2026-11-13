import { describe, expect, it } from "vitest";
import { activityPoints, overtakes, rankCompetitors, TIERS, leagueZone, type ScoreRecord, type Competitor, type CompetitionSnapshot } from "@/features/groups/competition";
const today = "2026-10-20";
const record = (patch: Partial<ScoreRecord> = {}): ScoreRecord => ({ id: "1", user_id: "a", for_date: today, status: "done", sets: 3, reps: 10, ...patch });
function member(id: string, score: number): Competitor {
  const points = activityPoints([], [], today);
  return { ...points, week: { ...points.week, total: score }, userId: id, name: id, isMe: id === "a", rank: 0 };
}
const snapshot = (members: Competitor[], weekFrom = "2026-10-19"): CompetitionSnapshot => ({ groupId: "g", today, weekFrom, members: rankCompetitors(members) });
describe("competition points", () => {
  it("uses weekly promotion/relegation zones and protects small/new cohorts", () => {
    const league = { index: 2, name: "실버", icon: "🥈", eligibleFrom: "2026-10-19", lastResult: null, lastWeek: null };
    const members = [member("a", 100), member("b", 50), member("c", 0)].map(m => ({ ...m, league }));
    expect(members.map(m => leagueZone(m, members, "2026-10-19"))).toEqual(["promotion", "stay", "demotion"]);
    expect(leagueZone(members[0], members.slice(0, 2), "2026-10-19")).toBe("stay");
    expect(leagueZone({ ...members[0], league: { ...league, eligibleFrom: "2026-10-26" } }, members, "2026-10-19")).toBe("placement");
    const tied = members.map(m => ({ ...m, week: { ...m.week, total: 50 } }));
    expect(tied.map(m => leagueZone(m, tied, "2026-10-19"))).toEqual(["stay", "stay", "stay"]);
  });
  it("awards actual sets, repetitions, conditioning and one daily bonus", () => {
    expect(activityPoints([record()], [record({ duration_min: 10 })], today).week).toEqual({ sets: 12, reps: 6, conditioning: 20, attendance: 20, total: 58 });
  });
  it("uses per-set snapshots instead of planned uniform sets", () => {
    expect(activityPoints([record({ sets: 20, reps: 100, set_details: [{ reps: 10 }, { reps: 5 }] })], [], today).week.total).toBe(31);
  });
  it("deduplicates records and recomputes on undo or repeat", () => {
    expect(activityPoints([record(), record()], [], today).week.total).toBe(38);
    expect(activityPoints([record({ status: "skipped" })], [], today).week.total).toBe(0);
    expect(activityPoints([], [], today).lifetime.total).toBe(0);
  });
  it("excludes partial, future and invalid quantities", () => {
    expect(activityPoints([record({ status: "partial" }), record({ id: "2", for_date: "2026-10-21" }), record({ id: "3", sets: -5 }), record({ id: "4", reps: NaN })], [], today).week.total).toBe(0);
  });
  it("caps each day rather than rewarding unlimited training", () => {
    const rows = Array.from({ length: 50 }, (_, i) => record({ id: String(i), sets: 20, reps: 100, duration_min: 60 }));
    expect(activityPoints(rows, rows, today).today.total).toBe(320);
  });
  it("keeps lifetime XP while weekly points reset on Monday", () => {
    const p = activityPoints([record({ for_date: "2026-10-18" })], [], today);
    expect(p.week.total).toBe(0); expect(p.lifetime.total).toBe(38);
  });
  it("awards no phantom points for empty legacy records", () => {
    expect(activityPoints([record({ sets: null, reps: null })], [record({ duration_min: null })], today).lifetime.total).toBe(0);
  });
  it("has six weekly leagues, not XP-purchase thresholds", () => {
    expect(TIERS.map(t => t.name)).toEqual(["루키", "브론즈", "실버", "골드", "플래티넘", "다이아몬드"]);
  });
  it("assigns joint ranks without arbitrary name or calorie tie breaks", () => {
    expect(rankCompetitors([member("c", 10), member("b", 20), member("a", 20)]).map(m => m.rank)).toEqual([1, 1, 3]);
  });
  it("announces strict overtakes once, not ties, membership changes or week resets", () => {
    const a = snapshot([member("a", 10), member("b", 20)]);
    const b = snapshot([member("a", 30), member("b", 20)]);
    expect(overtakes(a, b)[0].winner.userId).toBe("a");
    expect(overtakes(b, b)).toEqual([]);
    expect(overtakes(a, snapshot([member("a", 20), member("b", 20)]))).toEqual([]);
    expect(overtakes(a, snapshot([member("a", 30), member("c", 20)]))).toEqual([]);
    expect(overtakes(a, { ...b, weekFrom: "2026-10-26" })).toEqual([]);
    expect(overtakes(a, snapshot([member("a", 10), member("b", 5)]))).toEqual([]);
  });
});
