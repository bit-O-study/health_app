import { describe, expect, it } from "vitest";

import { prefillFromLast, pyramidSets, recommendsPyramid, topOf } from "@/features/routine/pyramid";

describe("추천이 세트 방식을 골라 준다 — 피라미드(2026-10-14)", () => {
  it("큰 복합 운동 · 중급 이상에게만 권한다", () => {
    expect(recommendsPyramid("squat", "intermediate")).toBe(true);
    expect(recommendsPyramid("bench-press", "advanced")).toBe(true);
    expect(recommendsPyramid("squat", "beginner")).toBe(false); // 초급은 자세가 먼저
    expect(recommendsPyramid("biceps-curl", "advanced")).toBe(false); // 고립 운동
    expect(recommendsPyramid("squat", null)).toBe(false);
  });

  it("올라가는 두 세트 뒤 기준 무게로 본세트 — 60kg × 10회 × 4세트 → 50×12 · 55×10 · 60×8 · 60×8", () => {
    expect(pyramidSets(60, 10, 4, 5)).toEqual([
      { weightKg: 50, reps: 12 },
      { weightKg: 55, reps: 10 },
      { weightKg: 60, reps: 8 },
      { weightKg: 60, reps: 8 },
    ]);
    // 눈금 2.5kg 이면 더 촘촘하게.
    expect(pyramidSets(100, 6, 3, 2.5)!.map((s) => s.weightKg)).toEqual([85, 92.5, 100]);
  });

  it("못 만들면 null — 맨몸 · 세트 부족 · 눈금이 굵어 무게가 안 갈릴 때", () => {
    expect(pyramidSets(null, 10, 4, 5)).toBeNull();
    expect(pyramidSets(60, 10, 2, 5)).toBeNull();
    expect(pyramidSets(10, 10, 4, 10)).toBeNull(); // 85% 도 10kg 로 맞춰진다
  });

  it("횟수는 1 밑으로 내려가지 않는다", () => {
    expect(pyramidSets(100, 2, 3, 5)!.map((s) => s.reps)).toEqual([4, 2, 1]);
  });

  it("세트별 기록의 대표값은 가장 무거운 세트", () => {
    expect(topOf([{ weightKg: 50, reps: 12 }, { weightKg: 60, reps: 8 }, { weightKg: 60, reps: 9 }])).toEqual({ weightKg: 60, reps: 9 });
  });
});

describe("지난번 값으로 미리 채우기 — 세트별까지", () => {
  const flatPlan = { sets: 4, reps: 10, weightKg: 60, setDetails: null };
  const pyramidPlan = { sets: 4, reps: 12, weightKg: 50, setDetails: pyramidSets(60, 10, 4, 5) };

  it("기록이 없으면 계획 그대로", () => {
    expect(prefillFromLast(pyramidPlan, null, 5)).toBe(pyramidPlan);
  });

  it("둘 다 균일이면 예전처럼 지난번 무게·횟수·세트", () => {
    expect(prefillFromLast(flatPlan, { sets: 5, reps: 8, weightKg: 70 }, 5)).toEqual({ sets: 5, reps: 8, weightKg: 70, setDetails: null });
  });

  it("지난번을 세트별로 했으면 그 세트들을 그대로 — 내가 고친 값까지", () => {
    const mine = [{ weightKg: 55, reps: 12 }, { weightKg: 65, reps: 9 }, { weightKg: 75, reps: 6 }];
    expect(prefillFromLast(flatPlan, { sets: 3, reps: 12, weightKg: 55, setDetails: mine }, 5)).toEqual({ sets: 3, reps: 12, weightKg: 55, setDetails: mine });
  });

  it("추천 피라미드는 처방 무게가 아니라 내 지난번 무게로 다시 만든다 — 80kg × 6회 × 4세트", () => {
    const r = prefillFromLast(pyramidPlan, { sets: 4, reps: 6, weightKg: 80 }, 5);
    // 지난번 6회가 본세트 횟수 → 올라가는 세트는 10회 · 8회.
    expect(r.setDetails).toEqual([
      { weightKg: 70, reps: 10 },
      { weightKg: 75, reps: 8 },
      { weightKg: 80, reps: 6 },
      { weightKg: 80, reps: 6 },
    ]);
    expect(r).toMatchObject({ sets: 4, reps: 10, weightKg: 70 });
  });

  it("지난번에 무게를 안 남겼으면 기준으로 삼을 무게가 없다 — 추천 피라미드 그대로", () => {
    expect(prefillFromLast(pyramidPlan, { sets: 3, reps: 15, weightKg: null }, 5)).toBe(pyramidPlan);
  });

  it("눈금이 굵어 지난번 무게로 피라미드가 안 만들어지면 균일로 돌아간다", () => {
    expect(prefillFromLast(pyramidPlan, { sets: 4, reps: 10, weightKg: 10 }, 10)).toEqual({ sets: 4, reps: 10, weightKg: 10, setDetails: null });
  });
});
