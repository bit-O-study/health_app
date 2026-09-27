import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  MAX_STEP_KG,
  MIN_STEP_KG,
  WEIGHT_STEP_CHOICES,
  isValidStepKg,
  parseWeightSteps,
  stepOverrideFor,
  withWeightStep,
} from "@/features/routine/weight-steps";
import { weightStepKg } from "@/features/routine/progress";

/**
 * 종목별 증량 단위 — 헬스장마다 스택이 다르다(1kg 씩 올라가는 머신, 1.25kg 원판이
 * 없는 곳 등). 기본값은 기구·종목 크기로 정하고, 사용자가 정한 값이 그걸 이긴다.
 */

describe("parseWeightSteps — DB 값 방어", () => {
  it("숫자만 통과시킨다", () => {
    expect(parseWeightSteps({ "pec-deck": 1, squat: 2.5 })).toEqual({
      "pec-deck": 1,
      squat: 2.5,
    });
  });

  it("문자열 숫자도 받아들인다(jsonb 로 오가며 바뀔 수 있다)", () => {
    expect(parseWeightSteps({ squat: "5" })).toEqual({ squat: 5 });
  });

  it("이상한 항목은 그것만 버리고 나머지는 지킨다", () => {
    expect(
      parseWeightSteps({ squat: 5, bad: "abc", huge: 999, zero: 0, neg: -2 }),
    ).toEqual({ squat: 5 });
  });

  it("객체가 아니면 빈 맵", () => {
    expect(parseWeightSteps(null)).toEqual({});
    expect(parseWeightSteps([1, 2])).toEqual({});
    expect(parseWeightSteps("x")).toEqual({});
  });

  it("말도 안 되게 긴 키는 버린다", () => {
    expect(parseWeightSteps({ ["x".repeat(200)]: 5 })).toEqual({});
  });
});

describe("withWeightStep — 저장할 다음 맵", () => {
  it("값을 넣고 바꾼다", () => {
    expect(withWeightStep({}, "squat", 5)).toEqual({ squat: 5 });
    expect(withWeightStep({ squat: 5 }, "squat", 2.5)).toEqual({ squat: 2.5 });
  });

  it("null 이면 그 종목만 지운다 — 기본값으로 되돌아간다", () => {
    expect(withWeightStep({ squat: 5, "pec-deck": 1 }, "squat", null)).toEqual({
      "pec-deck": 1,
    });
  });

  it("범위를 벗어난 값은 **바꾸지 않는다**(조용히 이상한 값을 넣지 않게)", () => {
    const current = { squat: 5 };
    expect(withWeightStep(current, "squat", 0)).toEqual(current);
    expect(withWeightStep(current, "squat", 100)).toEqual(current);
    expect(withWeightStep(current, "", 5)).toEqual(current);
  });

  it("원본을 건드리지 않는다", () => {
    const current = { squat: 5 };
    withWeightStep(current, "squat", null);
    expect(current).toEqual({ squat: 5 });
  });

  it("고를 수 있는 값은 전부 유효하다", () => {
    for (const kg of WEIGHT_STEP_CHOICES) {
      expect(isValidStepKg(kg)).toBe(true);
      expect(kg).toBeGreaterThanOrEqual(MIN_STEP_KG);
      expect(kg).toBeLessThanOrEqual(MAX_STEP_KG);
    }
  });
});

describe("기본 규칙 위에 덮어쓰기", () => {
  it("사용자가 정한 단위가 기구 기본값을 이긴다", () => {
    // 펙덱(작은 핀 스택)의 기본은 2.5kg 인데, 1kg 씩 올라가는 헬스장이 있다.
    expect(weightStepKg("pec-deck", "machine")).toBe(2.5);
    const steps = { "pec-deck": 1 };
    expect(
      weightStepKg("pec-deck", "machine", stepOverrideFor(steps, "pec-deck")),
    ).toBe(1);
  });

  it("다른 종목은 영향받지 않는다", () => {
    const steps = { "pec-deck": 1 };
    expect(weightStepKg("squat", "barbell", stepOverrideFor(steps, "squat"))).toBe(5);
  });

  it("설정이 없으면 null — 기본 규칙 그대로", () => {
    expect(stepOverrideFor({}, "squat")).toBeNull();
    expect(stepOverrideFor(undefined, "squat")).toBeNull();
    expect(stepOverrideFor({ squat: 999 }, "squat")).toBeNull();
  });
});

describe("연결 가드", () => {
  const read = (rel: string) =>
    fs.readFileSync(path.join(process.cwd(), rel), "utf8");

  it("스키마에 weight_steps 컬럼이 선언돼 있다", () => {
    expect(read("supabase/schema.sql")).toContain(
      "add column if not exists weight_steps jsonb",
    );
  });

  it("프로필 조회가 그 컬럼을 읽어 온다", () => {
    const src = read("src/features/profile/data-access.ts");
    expect(src).toContain("weight_steps");
    expect(src).toContain("weightSteps: parseWeightSteps(row.weight_steps)");
  });

  it("과부하 추천도 같은 단위를 쓴다 — 화면마다 다른 무게를 권하면 안 된다", () => {
    expect(read("src/features/routine/overload-advice.ts")).toContain(
      "stepOverrideFor(weightSteps, t.exerciseId)",
    );
    expect(read("src/features/routine/overload-actions.ts")).toContain(
      "profile.weightSteps",
    );
  });

  it("운동모드가 사용자 단위로 ± 폭을 잡는다", () => {
    const src = read("src/features/workout-timer/guided-workout.tsx");
    expect(src).toContain("stepOverrideFor(weightSteps, item.exerciseId)");
    expect(src).toContain("<WeightStepPicker");
  });
});
