import { describe, expect, it } from "vitest";

import {
  hasRegionTraining,
  regionPointsFromTraining,
} from "@/features/routine/score";

const TODAY = "2026-06-03";

describe("regionPointsFromTraining (부위별 운동량 반영)", () => {
  it("기록이 없으면 모든 부위 0 + hasRegionTraining false", () => {
    const p = regionPointsFromTraining([], 70, TODAY);
    expect(Object.values(p).every((v) => v === 0)).toBe(true);
    expect(hasRegionTraining(p)).toBe(false);
  });

  it("가슴 운동 완료 → 가슴 부위만 점수 반영", () => {
    const p = regionPointsFromTraining(
      [{ forDate: TODAY, focus: "chest", sets: 4, reps: 10, weightKg: 60 }],
      70,
      TODAY,
    );
    expect(p.chest).toBeGreaterThan(0);
    expect(p.back).toBe(0);
    expect(p.arm).toBe(0);
    expect(hasRegionTraining(p)).toBe(true);
  });

  it("전신(fullbody) → 가슴·등·하체·어깨·코어 반영, 팔 제외", () => {
    const p = regionPointsFromTraining(
      [{ forDate: TODAY, focus: "fullbody", sets: 5, reps: 10, weightKg: 50 }],
      70,
      TODAY,
    );
    for (const r of ["chest", "back", "leg", "shoulder", "core"] as const) {
      expect(p[r]).toBeGreaterThan(0);
    }
    expect(p.arm).toBe(0);
  });

  it("밀기(push) → 가슴·어깨·팔 반영", () => {
    const p = regionPointsFromTraining(
      [{ forDate: TODAY, focus: "push", sets: 3, reps: 10, weightKg: 40 }],
      70,
      TODAY,
    );
    expect(p.chest).toBeGreaterThan(0);
    expect(p.shoulder).toBeGreaterThan(0);
    expect(p.arm).toBeGreaterThan(0);
    expect(p.back).toBe(0);
  });

  it("맨몸 운동(weight null)은 사용자 체중으로 가중", () => {
    const heavy = regionPointsFromTraining(
      [{ forDate: TODAY, focus: "core", sets: 3, reps: 15, weightKg: null }],
      90,
      TODAY,
    );
    const light = regionPointsFromTraining(
      [{ forDate: TODAY, focus: "core", sets: 3, reps: 15, weightKg: null }],
      50,
      TODAY,
    );
    expect(heavy.core).toBeGreaterThan(light.core);
  });

  it("오래된 기록은 반감기로 가중치 ↓", () => {
    const fresh = regionPointsFromTraining(
      [{ forDate: TODAY, focus: "chest", sets: 4, reps: 10, weightKg: 60 }],
      70,
      TODAY,
    ).chest;
    const old = regionPointsFromTraining(
      [{ forDate: "2026-05-06", focus: "chest", sets: 4, reps: 10, weightKg: 60 }],
      70,
      TODAY,
    ).chest;
    expect(old).toBeLessThan(fresh);
  });

  it("focus 없거나 매핑 안 되는 기록은 제외", () => {
    const p = regionPointsFromTraining(
      [
        { forDate: TODAY, focus: null, sets: 4, reps: 10, weightKg: 60 },
        { forDate: TODAY, focus: "unknown-focus", sets: 4, reps: 10, weightKg: 60 },
      ],
      70,
      TODAY,
    );
    expect(hasRegionTraining(p)).toBe(false);
  });
});
