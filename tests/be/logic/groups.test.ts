import { describe, expect, it } from "vitest";

import { rankMembers, weekRange, type MemberStat } from "@/features/groups/ranking";

const stat = (over: Partial<MemberStat>): MemberStat => ({
  userId: over.userId ?? "u",
  name: over.name ?? "이름",
  kcal: over.kcal ?? 0,
  workouts: over.workouts ?? 0,
  days: over.days ?? 0,
  todayIntake: over.todayIntake ?? 0,
  todayBurned: over.todayBurned ?? 0,
  isMe: over.isMe ?? false,
});

describe("weekRange — 월~일", () => {
  it("수요일이면 그 주 월요일~일요일", () => {
    // 2026-06-24는 수요일
    expect(weekRange("2026-06-24")).toEqual({ from: "2026-06-22", to: "2026-06-28" });
  });
  it("일요일은 같은 주(이전 월요일~당일)", () => {
    // 2026-06-28 일요일
    expect(weekRange("2026-06-28")).toEqual({ from: "2026-06-22", to: "2026-06-28" });
  });
  it("월요일은 그날부터", () => {
    expect(weekRange("2026-06-22")).toEqual({ from: "2026-06-22", to: "2026-06-28" });
  });
});

describe("rankMembers — kcal 내림차순, 동점 처리", () => {
  it("kcal 큰 순으로 1등부터", () => {
    const r = rankMembers([
      stat({ userId: "a", name: "A", kcal: 100 }),
      stat({ userId: "b", name: "B", kcal: 300 }),
      stat({ userId: "c", name: "C", kcal: 200 }),
    ]);
    expect(r.map((m) => m.userId)).toEqual(["b", "c", "a"]);
    expect(r.map((m) => m.rank)).toEqual([1, 2, 3]);
  });

  it("kcal·운동수 동점이면 같은 등수, 다음은 건너뜀", () => {
    const r = rankMembers([
      stat({ userId: "a", name: "A", kcal: 200, workouts: 3 }),
      stat({ userId: "b", name: "B", kcal: 200, workouts: 3 }),
      stat({ userId: "c", name: "C", kcal: 100 }),
    ]);
    expect(r.map((m) => m.rank)).toEqual([1, 1, 3]);
  });

  it("kcal 동점이면 운동 수로 가른다", () => {
    const r = rankMembers([
      stat({ userId: "a", name: "A", kcal: 200, workouts: 2 }),
      stat({ userId: "b", name: "B", kcal: 200, workouts: 5 }),
    ]);
    expect(r.map((m) => m.userId)).toEqual(["b", "a"]);
  });
});
