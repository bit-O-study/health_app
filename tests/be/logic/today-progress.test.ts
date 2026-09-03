import { describe, expect, it } from "vitest";

import { todayProgress } from "@/features/routine/today-progress";

describe("todayProgress — 오늘 운동 진행률(개수 기준)", () => {
  it("완료/전체를 그대로 말한다", () => {
    const p = todayProgress({ total: 8, done: 3, skipped: 0 });
    expect(p.label).toBe("3/8 완료");
    expect(p.remaining).toBe(5);
    expect(p.donePct).toBe(38);
    expect(p.skippedPct).toBe(0);
    expect(p.settled).toBe(false);
  });

  it("'오늘 안 함'도 끝난 것으로 쳐서 막대를 채운다 — 다 끝낸 날 막대가 덜 차 있으면 안 된다", () => {
    const p = todayProgress({ total: 4, done: 3, skipped: 1 });
    expect(p.remaining).toBe(0);
    expect(p.settled).toBe(true);
    expect(p.donePct + p.skippedPct).toBe(100);
    // 완료와 같은 색으로 세지는 않는다 — 구간이 나뉜다.
    expect(p.donePct).toBe(75);
    expect(p.skippedPct).toBe(25);
  });

  it("넘긴 게 없으면 꼬리말을 만들지 않는다", () => {
    expect(todayProgress({ total: 3, done: 1, skipped: 0 }).skippedLabel).toBeNull();
    expect(todayProgress({ total: 3, done: 1, skipped: 2 }).skippedLabel).toBe(
      "2개 넘김",
    );
  });

  it("담긴 게 없으면 0으로만 말하고 settled 는 아니다(빈 날을 '다 했다'로 만들지 않는다)", () => {
    const p = todayProgress({ total: 0, done: 0, skipped: 0 });
    expect(p.label).toBe("0/0 완료");
    expect(p.donePct).toBe(0);
    expect(p.settled).toBe(false);
  });

  it("상태가 어긋나 합이 전체를 넘어도 막대가 100%를 안 넘는다", () => {
    const p = todayProgress({ total: 2, done: 3, skipped: 5 });
    expect(p.done).toBe(2);
    expect(p.skipped).toBe(0);
    expect(p.donePct + p.skippedPct).toBeLessThanOrEqual(100);
    expect(p.settled).toBe(true);
  });

  it("반올림이 겹쳐도 두 구간 합이 100을 넘지 않는다", () => {
    const p = todayProgress({ total: 3, done: 1, skipped: 1 });
    expect(p.donePct).toBe(33);
    expect(p.donePct + p.skippedPct).toBeLessThanOrEqual(100);
  });

  it("음수·NaN 같은 값이 들어와도 터지지 않는다", () => {
    const p = todayProgress({ total: 5, done: -2, skipped: Number.NaN });
    expect(p.done).toBe(0);
    expect(p.skipped).toBe(0);
    expect(p.remaining).toBe(5);
  });
});
