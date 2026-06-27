import { describe, expect, it } from "vitest";

import {
  estimateTodayKcal,
  estimateStrengthKcal,
  estimateConditioningKcal,
} from "@/features/routine/calories";

// 캘린더의 '운동 소비' 합계가 운동모드 '총 kcal'과 동일한 방식(raw 합산 후 1회 반올림)으로
// 계산되는지 — 그리고 항목별로 먼저 반올림하면 값이 어긋날 수 있음을 보장한다.

const W = 73;
const plan = [
  { exerciseId: "barbell-squat", sets: 5 },
  { exerciseId: "bench-press", sets: 4 },
  { exerciseId: "deadlift", sets: 3 },
];
const warmup = [{ itemId: "running", durationMin: 7, speed: 9 }];
const cooldown = [{ itemId: "cycling", durationMin: 11, speed: null }];

describe("운동 kcal 합산 방식 — 캘린더 = 운동모드 총합", () => {
  const today = estimateTodayKcal({ weightKg: W, plan, warmup, cooldown });

  it("raw 합산 후 1회 반올림이 운동모드 총합과 일치", () => {
    const raw =
      plan.reduce((s, p) => s + estimateStrengthKcal(W, p.exerciseId, p.sets), 0) +
      warmup.reduce(
        (s, r) => s + estimateConditioningKcal(W, r.itemId, r.durationMin, r.speed),
        0,
      ) +
      cooldown.reduce(
        (s, r) => s + estimateConditioningKcal(W, r.itemId, r.durationMin, r.speed),
        0,
      );
    expect(Math.round(raw)).toBe(today.total);
  });

  it("항목별 선반올림 합은 어긋날 수 있다(과거 캘린더 day-detail 버그)", () => {
    const perItem =
      plan.reduce(
        (s, p) => s + Math.round(estimateStrengthKcal(W, p.exerciseId, p.sets)),
        0,
      ) +
      Math.round(estimateConditioningKcal(W, "running", 7, 9)) +
      Math.round(estimateConditioningKcal(W, "cycling", 11, null));
    // 선반올림 합과 raw-합-후-반올림이 다를 수 있음(차이는 보통 1~3 kcal)
    expect(Math.abs(perItem - today.total)).toBeLessThanOrEqual(3);
  });
});
