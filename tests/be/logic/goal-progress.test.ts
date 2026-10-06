import { describe, expect, it } from "vitest";

import {
  defaultTargetDate,
  goalLimit,
  goalProgress,
  slopePerDay,
  suggestTargetKg,
  validateGoalInput,
  type LiftGoal,
} from "@/features/lite/goal-progress";

const goal: LiftGoal = {
  id: "g1",
  exerciseId: "bench-press",
  startKg: 80,
  targetKg: 100,
  startDate: "2026-09-01",
  targetDate: "2026-12-31",
  achievedAt: null,
};

/** 주 1kg 씩 오르는 기록(일주일 간격). */
const weekly = (from: string, startKg: number, n: number, perWeek = 1) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date(`${from}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i * 7);
    return { date: d.toISOString().slice(0, 10), value: startKg + i * perWeek };
  });

describe("목표 진행률", () => {
  it("🔴 진행률 = (지금 − 시작) ÷ (목표 − 시작)", () => {
    const p = goalProgress(goal, weekly("2026-09-03", 82, 5), "2026-10-02");
    expect(p.currentKg).toBe(86);
    expect(p.pct).toBe(30);
    expect(p.achieved).toBe(false);
  });

  it("🔴 최근 6주 기울기로 예상 도달일 — 주 1kg 이면 14kg 남은 걸 14주 뒤", () => {
    const p = goalProgress(goal, weekly("2026-09-03", 82, 5), "2026-10-01");
    expect(p.slopePerWeek).toBe(1);
    expect(p.etaDate).toBe("2027-01-07"); // 10/01 + 98일
    expect(p.aheadDays).toBe(-7);
    expect(p.stalled).toBe(false);
  });

  it("🔴 기록이 4번 미만이면 예상일을 말하지 않는다", () => {
    const p = goalProgress(goal, weekly("2026-09-17", 84, 3), "2026-10-01");
    expect(p.etaDate).toBeNull();
    expect(p.slopePerWeek).toBeNull();
    expect(p.neededPerWeek).not.toBeNull();
  });

  it("제자리면 정체 — 예상일 없음", () => {
    const p = goalProgress(goal, weekly("2026-09-03", 85, 5, 0), "2026-10-01");
    expect(p.stalled).toBe(true);
    expect(p.etaDate).toBeNull();
  });

  it("목표 넘으면 100% · 달성", () => {
    const p = goalProgress(goal, [{ date: "2026-10-01", value: 101 }], "2026-10-01");
    expect(p.pct).toBe(100);
    expect(p.achieved).toBe(true);
    expect(p.neededPerWeek).toBeNull();
  });

  it("기록이 없으면 시작값 · 0%", () => {
    const p = goalProgress(goal, [], "2026-10-01");
    expect(p.currentKg).toBe(80);
    expect(p.pct).toBe(0);
  });

  it("필요 속도 = 남은 kg ÷ 남은 주", () => {
    const p = goalProgress({ ...goal, targetDate: "2026-10-29" }, [{ date: "2026-10-01", value: 90 }], "2026-10-01");
    expect(p.weeksLeft).toBe(4);
    expect(p.neededPerWeek).toBe(2.5);
  });

  it("기울기 계산", () => {
    expect(slopePerDay([{ date: "2026-10-01", value: 80 }])).toBeNull();
    expect(slopePerDay(weekly("2026-09-01", 80, 3, 7))).toBeCloseTo(1, 5);
  });
});

describe("목표 입력·한도", () => {
  it("🔴 무료 1개 · 라이트 이상 3개", () => {
    expect(goalLimit("free")).toBe(1);
    expect(goalLimit("lite")).toBe(3);
    expect(goalLimit("pro")).toBe(3);
  });

  it("기본값: 지금 +10% 를 2.5kg 단위로, 3개월 뒤", () => {
    expect(suggestTargetKg(82.5)).toBe(92.5);
    expect(suggestTargetKg(0)).toBe(2.5);
    expect(defaultTargetDate("2026-10-02")).toBe("2027-01-01");
  });

  it("입력 검사", () => {
    const today = "2026-10-02";
    expect(validateGoalInput({ startKg: 80, targetKg: 100, targetDate: "2027-01-01" }, today)).toBeNull();
    expect(validateGoalInput({ startKg: 80, targetKg: 80, targetDate: "2027-01-01" }, today)).toMatch(/무거워야/);
    expect(validateGoalInput({ startKg: 80, targetKg: 90, targetDate: "2026-10-20" }, today)).toMatch(/4주/);
    expect(validateGoalInput({ startKg: 80, targetKg: 90, targetDate: "2028-01-01" }, today)).toMatch(/1년/);
    expect(validateGoalInput({ startKg: 80, targetKg: 90, targetDate: "내일" }, today)).toMatch(/날짜/);
  });
});
