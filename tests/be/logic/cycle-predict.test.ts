import { describe, expect, it } from "vitest";

import {
  predictCycle,
  predictedPeriodDatesInRange,
} from "@/features/cycle/cycle-predict";

describe("predictCycle — 월경 주기 예측", () => {
  it("기록 없으면 기본값(28일), 예측 없음", () => {
    const p = predictCycle([], "2026-06-27");
    expect(p.avgCycle).toBe(28);
    expect(p.nextStart).toBeNull();
    expect(p.lastStart).toBeNull();
  });

  it("규칙적 28일 간격 → 다음 생리·배란·D-day 계산", () => {
    const p = predictCycle(["2026-05-02", "2026-05-30"], "2026-06-10");
    expect(p.avgCycle).toBe(28);
    expect(p.lastStart).toBe("2026-05-30");
    // 5/30 + 28 = 6/27
    expect(p.nextStart).toBe("2026-06-27");
    // 배란 = 다음생리 - 14 = 6/13
    expect(p.ovulation).toBe("2026-06-13");
    expect(p.daysUntilNext).toBe(17); // 6/27 - 6/10
    expect(p.dayOfCycle).toBe(12); // 5/30~6/10
  });

  it("불규칙 간격은 중앙값으로 추정(이상치 완화)", () => {
    // 간격: 28, 30, 26 → 중앙값 28
    const p = predictCycle(
      ["2026-01-01", "2026-01-29", "2026-02-28", "2026-03-26"],
      "2026-03-30",
    );
    expect(p.avgCycle).toBe(28);
  });

  it("다음 예정일이 이미 지났으면 다가오는 날로 굴린다", () => {
    const p = predictCycle(["2026-01-01"], "2026-06-27");
    // 1/1 + 28 은 한참 전 → 6/27 이후로 굴러간 날
    expect(p.nextStart).not.toBeNull();
    expect(p.nextStart! >= "2026-06-27").toBe(true);
  });

  it("예측 생리일 범위 나열 — 월 안의 미래 생리기간", () => {
    const p = predictCycle(["2026-06-01"], "2026-06-10");
    // 다음 시작 6/29, 생리 5일 → 6/29,30 (7월로 넘어가는 건 제외)
    const dates = predictedPeriodDatesInRange(p, "2026-06-11", "2026-06-30");
    expect(dates).toContain("2026-06-29");
    expect(dates).toContain("2026-06-30");
    expect(dates).not.toContain("2026-07-01");
  });
});
