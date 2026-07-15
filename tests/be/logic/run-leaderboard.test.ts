import { describe, expect, it } from "vitest";

import {
  formatMeters,
  pickRunLeaderboard,
  type RunRankMember,
} from "@/features/running/leaderboard";

const mk = (id: string, name: string, meters: number): RunRankMember => ({
  userId: id,
  name,
  meters,
});

describe("pickRunLeaderboard", () => {
  it("거리 내림차순으로 순위를 매긴다", () => {
    const rows = pickRunLeaderboard(
      [mk("a", "A", 100), mk("b", "B", 300), mk("c", "C", 200)],
      "a",
    );
    expect(rows.map((r) => r.name)).toEqual(["B", "C", "A"]);
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 3]);
    expect(rows.find((r) => r.userId === "a")!.isMe).toBe(true);
  });

  it("5명 이하면 전부 표시", () => {
    const rows = pickRunLeaderboard(
      [mk("a", "A", 10), mk("b", "B", 20)],
      "a",
    );
    expect(rows).toHaveLength(2);
  });

  it("내가 5등 이상이면 상위 4 + 내 줄(총 5)", () => {
    const members = [
      mk("1", "1", 600),
      mk("2", "2", 500),
      mk("3", "3", 400),
      mk("4", "4", 300),
      mk("5", "5", 200),
      mk("me", "나", 50),
    ];
    const rows = pickRunLeaderboard(members, "me");
    expect(rows).toHaveLength(5);
    expect(rows.slice(0, 4).map((r) => r.name)).toEqual(["1", "2", "3", "4"]);
    const last = rows[4];
    expect(last.isMe).toBe(true);
    expect(last.rank).toBe(6); // 실제 순위 유지
    expect(last.meters).toBe(50);
  });

  it("내가 4등 이내면 상위 5줄을 보여주고 내 줄 강조", () => {
    const members = [
      mk("1", "1", 600),
      mk("2", "나", 500),
      mk("3", "3", 400),
      mk("4", "4", 300),
      mk("5", "5", 200),
      mk("6", "6", 100),
    ];
    const rows = pickRunLeaderboard(members, "2");
    expect(rows).toHaveLength(5);
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5]);
    expect(rows.find((r) => r.isMe)!.name).toBe("나");
  });
});

describe("formatMeters", () => {
  it("1000m 미만은 m, 이상은 km", () => {
    expect(formatMeters(0)).toBe("0m");
    expect(formatMeters(950)).toBe("950m");
    expect(formatMeters(1234)).toBe("1.23km");
  });
});
