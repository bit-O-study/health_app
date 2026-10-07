import { describe, expect, it } from "vitest";

import { memberTrend, periodRanges, sortDroppedFirst, sparkRanges } from "@/features/trainer/trends";

// 트레이너 대시보드 회원 주별·월별 변화(2026-10-07) — 같은 일수끼리 비교, 공유 끈 칸은 비공개.

describe("기간 — 이번 vs 지난 기간 같은 일수", () => {
  it("주: 수요일이면 지난주도 월~수", () => {
    expect(periodRanges("week", "2026-10-07")).toEqual({
      cur: { from: "2026-10-05", to: "2026-10-07" },
      prev: { from: "2026-09-28", to: "2026-09-30" },
    });
  });
  it("월: 7일이면 지난달 1~7일, 지난달이 짧으면 말일까지", () => {
    expect(periodRanges("month", "2026-10-07").prev).toEqual({ from: "2026-09-01", to: "2026-09-07" });
    expect(periodRanges("month", "2026-03-31").prev).toEqual({ from: "2026-02-01", to: "2026-02-28" });
  });
  it("스파크라인 칸 — 주 8개·월 6개, 마지막은 오늘까지", () => {
    const w = sparkRanges("week", "2026-10-07");
    expect(w).toHaveLength(8);
    expect(w[0]).toEqual({ from: "2026-08-17", to: "2026-08-23" });
    expect(w[7]).toEqual({ from: "2026-10-05", to: "2026-10-07" });
    const m = sparkRanges("month", "2026-10-07");
    expect(m.map((r) => r.from)).toEqual(["2026-05-01", "2026-06-01", "2026-07-01", "2026-08-01", "2026-09-01", "2026-10-01"]);
    expect(m[4].to).toBe("2026-09-30");
  });
});

describe("회원 변화", () => {
  const row = {
    link: "a",
    workout: [
      { d: "2026-09-28", sets: 20 },
      { d: "2026-09-30", sets: 18 },
      { d: "2026-10-02", sets: 15 }, // 지난주 목요일 — 같은 일수(월~수) 비교에서 빠진다
      { d: "2026-10-06", sets: 9 },
    ],
    diet: ["2026-09-29", "2026-10-06", "2026-10-07"],
    body: [
      { d: "2026-10-01", kg: "75.4" },
      { d: "2026-10-06", kg: 75 },
    ],
  };

  it("이번 주(월~수) vs 지난주 월~수 — 줄었으면 dropped", () => {
    const t = memberTrend(row, "week", "2026-10-07");
    expect(t.days).toEqual({ now: 1, prev: 2, diff: -1 });
    expect(t.sets).toEqual({ now: 9, prev: 38, diff: -29 });
    expect(t.diet).toEqual({ now: 2, prev: 1, diff: 1 });
    // 체중은 지난주 전체의 마지막 값(10/1)과 비교.
    expect(t.weight).toEqual({ now: 75, diff: -0.4 });
    expect(t.spark).toHaveLength(8);
    expect(t.spark!.slice(-2)).toEqual([53, 9]);
    expect(t.dropped).toBe(true);
  });

  it("공유 끈 칸은 null 이고 줄었는지 판단에 안 쓴다", () => {
    const t = memberTrend({ link: "b", workout: null, diet: null, body: null }, "week", "2026-10-07");
    expect([t.days, t.sets, t.diet, t.weight, t.spark]).toEqual([null, null, null, null, null]);
    expect(t.dropped).toBe(false);
  });

  it("이번 기간 체중 기록이 없으면 now=null", () => {
    const t = memberTrend({ ...row, body: [{ d: "2026-09-20", kg: 76 }] }, "week", "2026-10-07");
    expect(t.weight).toEqual({ now: null, diff: null });
  });

  it("줄어든 회원 먼저, 나머지는 원래 순서", () => {
    const xs = [{ id: 1, dropped: false }, { id: 2, dropped: true }, { id: 3, dropped: false }, { id: 4, dropped: true }];
    expect(sortDroppedFirst(xs).map((x) => x.id)).toEqual([2, 4, 1, 3]);
  });
});

describe("회원 상세 — 지난 기간", () => {
  it("오늘이 든 기간이면 같은 일수, 지난 기간을 보고 있으면 그 앞 기간 전체", async () => {
    const { previousRange } = await import("@/features/trainer/member-report");
    expect(previousRange("week", { from: "2026-10-05", to: "2026-10-11" }, "2026-10-07")).toEqual({ from: "2026-09-28", to: "2026-09-30" });
    expect(previousRange("week", { from: "2026-09-28", to: "2026-10-04" }, "2026-10-07")).toEqual({ from: "2026-09-21", to: "2026-09-27" });
    expect(previousRange("month", { from: "2026-03-01", to: "2026-03-31" }, "2026-03-31")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(previousRange("year", { from: "2026-01-01", to: "2026-12-31" }, "2026-10-07")).toEqual({ from: "2025-01-01", to: "2025-10-07" });
  });
});
