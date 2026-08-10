import { describe, expect, it } from "vitest";

import {
  armSwapBlockReason,
  type ConditioningMutationState,
} from "@/features/routine/plan-editor-mutation-state";

const conditioning = (
  ...states: ConditioningMutationState[]
): Record<string, ConditioningMutationState> =>
  Object.fromEntries(states.map((state, index) => [`conditioning-${index}`, state]));

describe("armSwapBlockReason", () => {
  it("본운동 저장 중에는 새 편집과 팔 교환을 모두 막는다", () => {
    expect(
      armSwapBlockReason({
        mainDirtyCount: 0,
        mainPending: true,
        conditioningStates: {},
      }),
    ).toBe("pending");
  });

  it("워밍업 또는 마무리가 미저장이면 팔 교환을 막는다", () => {
    expect(
      armSwapBlockReason({
        mainDirtyCount: 0,
        mainPending: false,
        conditioningStates: conditioning({ dirty: true, pending: false }),
      }),
    ).toBe("dirty");
  });

  it("워밍업 또는 마무리 저장 중이면 팔 교환을 막는다", () => {
    expect(
      armSwapBlockReason({
        mainDirtyCount: 0,
        mainPending: false,
        conditioningStates: conditioning({ dirty: false, pending: true }),
      }),
    ).toBe("pending");
  });

  it("모든 에디터가 저장됐고 유휴 상태일 때만 교환을 허용한다", () => {
    expect(
      armSwapBlockReason({
        mainDirtyCount: 0,
        mainPending: false,
        conditioningStates: conditioning({ dirty: false, pending: false }),
      }),
    ).toBeNull();
  });
});
