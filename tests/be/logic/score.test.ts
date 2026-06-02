import { describe, expect, it } from "vitest";

import {
  balanceStatusFor,
  computeScore,
  type DoneRecord,
} from "@/features/routine/score";
import { seoulYmd } from "@/features/routine/data";

function daysAgo(n: number): string {
  // seoulYmd 기준으로 n일 전 (UTC epoch-day 산술 — 점수 모듈과 동일 기준)
  const [y, m, d] = seoulYmd().split("-").map(Number);
  const e = Math.floor(Date.UTC(y, m - 1, d) / 86_400_000) - n;
  const dt = new Date(e * 86_400_000);
  const p = (x: number) => String(x).padStart(2, "0");
  return `${dt.getUTCFullYear()}-${p(dt.getUTCMonth() + 1)}-${p(dt.getUTCDate())}`;
}

describe("score (운동 점수)", () => {
  it("완료 기록이 없으면 0점/스트릭 0", () => {
    const s = computeScore([], 70);
    expect(s.score).toBe(0);
    expect(s.currentStreak).toBe(0);
    expect(s.totalCount).toBe(0);
    expect(s.lastCompletedYmd).toBeNull();
  });

  it("오늘 한 운동 → 점수 > 0, 스트릭 1", () => {
    const recs: DoneRecord[] = [{ forDate: daysAgo(0), sets: 4, reps: 10, weightKg: 60 }];
    const s = computeScore(recs, 70);
    expect(s.score).toBeGreaterThan(0);
    expect(s.currentStreak).toBe(1);
    expect(s.last7DayCount).toBe(1);
  });

  it("오래된 기록은 반감기로 가중치가 낮다", () => {
    const fresh = computeScore([{ forDate: daysAgo(0), sets: 4, reps: 10, weightKg: 60 }], 70).score;
    const old = computeScore([{ forDate: daysAgo(28), sets: 4, reps: 10, weightKg: 60 }], 70).score;
    expect(old).toBeLessThan(fresh);
  });

  it("연속 3일 → currentStreak 3, longestStreak 3", () => {
    const s = computeScore(
      [daysAgo(0), daysAgo(1), daysAgo(2)].map((forDate) => ({ forDate, sets: 3, reps: 10, weightKg: 50 })),
      70,
    );
    expect(s.currentStreak).toBe(3);
    expect(s.longestStreak).toBe(3);
  });

  it("맨몸 운동은 사용자 체중으로 가중", () => {
    const heavy = computeScore([{ forDate: daysAgo(0), sets: 3, reps: 10, weightKg: null }], 90).score;
    const light = computeScore([{ forDate: daysAgo(0), sets: 3, reps: 10, weightKg: null }], 50).score;
    expect(heavy).toBeGreaterThan(light);
  });

  it("normalized 는 0~100 범위로 클램프", () => {
    const many: DoneRecord[] = Array.from({ length: 300 }, () => ({
      forDate: daysAgo(0), sets: 5, reps: 10, weightKg: 100,
    }));
    const s = computeScore(many, 70);
    expect(s.normalized).toBeLessThanOrEqual(100);
    expect(s.normalized).toBeGreaterThanOrEqual(0);
  });
});

describe("balanceStatusFor (부위 밸런스)", () => {
  it("최대 대비 70%+ → balanced, 40~70% → low, 그 미만 → under", () => {
    expect(balanceStatusFor(80, 100)).toBe("balanced");
    expect(balanceStatusFor(50, 100)).toBe("low");
    expect(balanceStatusFor(10, 100)).toBe("under");
  });
  it("최대가 0이면 under", () => {
    expect(balanceStatusFor(0, 0)).toBe("under");
  });
});
