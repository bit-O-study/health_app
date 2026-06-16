import { describe, expect, it } from "vitest";

import { guideFor } from "@/features/workout-timer/exercise-guides";

// 모든 카탈로그 운동 id (catalog 와 동기 — 빠지면 꿀팁 누락 가드).
const ALL_IDS = [
  "ab-rollout", "arnold-press", "assisted-pull-up", "barbell-row", "belt-squat",
  "bench-dip", "bench-press", "biceps-curl", "bicycle-crunch", "box-squat",
  "bulgarian-split-squat", "cable-crossover", "cable-crunch", "cable-kickback",
  "cable-lateral-raise", "cable-pull-through", "cable-rope-hammer-curl", "chest-fly",
  "chest-supported-row", "chin-up", "close-grip-bench-press", "concentration-curl",
  "cossack-squat", "crunch", "curtsy-lunge", "deadlift", "decline-press",
  "diamond-pushup", "dips", "donkey-calf-raise", "drag-curl", "dumbbell-pullover",
  "ez-bar-curl", "face-pull", "front-raise", "front-squat", "glute-bridge",
  "goblet-squat", "good-morning", "hack-squat", "hammer-curl", "hanging-leg-raise",
  "hip-abduction", "hip-adduction", "hip-thrust", "hollow-hold", "hyperextension",
  "incline-cable-fly", "incline-curl", "incline-press", "inverted-row", "lat-pulldown",
  "lateral-raise", "leg-curl", "leg-extension", "leg-press", "low-row-machine", "lunge",
  "machine-chest-press", "machine-rear-delt-fly", "machine-shoulder-press", "meadows-row",
  "mountain-climber", "ohp", "one-arm-dumbbell-row", "overhead-triceps-extension",
  "pallof-press", "pec-deck", "pendlay-row", "pistol-squat", "plank", "preacher-curl",
  "pull-up", "push-up", "rdl", "rear-delt-fly", "reverse-crunch", "reverse-curl",
  "reverse-pec-deck", "russian-twist", "seated-cable-row", "seated-calf-raise",
  "seated-leg-curl", "shrug", "side-plank", "single-leg-leg-press", "sissy-squat",
  "sit-up", "skull-crusher", "smith-bench-press", "smith-squat", "squat",
  "standing-cable-curl", "standing-calf-raise", "step-up", "stiff-leg-deadlift",
  "straight-arm-pulldown", "sumo-deadlift", "sumo-squat", "t-bar-row", "toes-to-bar",
  "triceps-kickback", "triceps-pushdown", "upright-row", "v-up", "walking-lunge",
  "wide-grip-pull-up", "wood-chopper", "wrist-curl", "zottman-curl",
];

describe("운동 꿀팁(proTips)", () => {
  it("모든 운동이 꿀팁을 2개 이상 가진다", () => {
    const missing = ALL_IDS.filter((id) => {
      const tips = guideFor(id).proTips;
      return !tips || tips.length < 2;
    });
    expect(missing).toEqual([]);
  });

  it("꿀팁은 한 줄 텍스트(빈 값 없음)", () => {
    for (const id of ALL_IDS) {
      for (const t of guideFor(id).proTips ?? []) {
        expect(t.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("어시스트 풀업: 그립/손 위치에 따라 자극이 달라진다는 꿀팁이 있다", () => {
    const tips = guideFor("assisted-pull-up").proTips ?? [];
    expect(tips.some((t) => /그립|언더|오버|광배/.test(t))).toBe(true);
  });
});

describe("운동 준비 셋업(setupSteps)", () => {
  it("모든 운동이 셋업 단계를 2개 이상 가진다(발→어깨→그립)", () => {
    const missing = ALL_IDS.filter((id) => {
      const s = guideFor(id).setupSteps;
      return !s || s.length < 2;
    });
    expect(missing).toEqual([]);
  });

  it("벤치프레스 셋업에 그립/손 잡는 법 안내가 있다", () => {
    const s = guideFor("bench-press").setupSteps ?? [];
    expect(s.some((x) => /그립|손|잡/.test(x))).toBe(true);
  });

  it("스쿼트 셋업에 발 위치 안내가 있다", () => {
    const s = guideFor("squat").setupSteps ?? [];
    expect(s.some((x) => /발/.test(x))).toBe(true);
  });
});
