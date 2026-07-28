import { describe, expect, it } from "vitest";

import { remapRowIds } from "@/features/routine/row-remap";
import { pickSetsDone } from "@/features/workout-timer/sets-done";

describe("remapRowIds — 계획을 통째로 다시 저장해도 완료가 안 풀리게", () => {
  it("같은 운동끼리 옛 행 → 새 행으로 이어준다", () => {
    expect(
      remapRowIds(
        [
          { id: "old1", exerciseId: "bench" },
          { id: "old2", exerciseId: "fly" },
        ],
        [
          { id: "new1", exerciseId: "bench" },
          { id: "new2", exerciseId: "fly" },
        ],
      ),
    ).toEqual([
      { from: "old1", to: "new1" },
      { from: "old2", to: "new2" },
    ]);
  });

  it("운동 추가로 순서가 밀려도 운동 기준으로 짝짓는다", () => {
    expect(
      remapRowIds(
        [{ id: "old1", exerciseId: "bench" }],
        [
          { id: "new0", exerciseId: "squat" }, // 새로 추가된 운동
          { id: "new1", exerciseId: "bench" },
        ],
      ),
    ).toEqual([{ from: "old1", to: "new1" }]);
  });

  it("계획에서 빠진 운동은 옮기지 않는다(고스트로 남김)", () => {
    expect(
      remapRowIds(
        [
          { id: "old1", exerciseId: "bench" },
          { id: "old2", exerciseId: "fly" },
        ],
        [{ id: "new1", exerciseId: "bench" }],
      ),
    ).toEqual([{ from: "old1", to: "new1" }]);
  });

  it("같은 운동이 2개면 순서대로 1:1", () => {
    expect(
      remapRowIds(
        [
          { id: "a", exerciseId: "bench" },
          { id: "b", exerciseId: "bench" },
        ],
        [
          { id: "x", exerciseId: "bench" },
          { id: "y", exerciseId: "bench" },
        ],
      ),
    ).toEqual([
      { from: "a", to: "x" },
      { from: "b", to: "y" },
    ]);
  });

  it("id 가 그대로면 옮길 게 없다", () => {
    expect(
      remapRowIds(
        [{ id: "same", exerciseId: "bench" }],
        [{ id: "same", exerciseId: "bench" }],
      ),
    ).toEqual([]);
  });

  it("빈 입력은 빈 결과", () => {
    expect(remapRowIds([], [{ id: "n", exerciseId: "bench" }])).toEqual([]);
    expect(remapRowIds([{ id: "o", exerciseId: "bench" }], [])).toEqual([]);
  });
});

describe("pickSetsDone — 행 id 가 바뀌어도 세트 진행이 이어진다", () => {
  it("행 id 저장분이 우선", () => {
    expect(pickSetsDone({ row1: 3 }, { "f:chest:bench": 1 }, "row1", "f:chest:bench")).toBe(3);
  });

  it("행 id 가 없으면 (부위:운동) 키로 이어받는다", () => {
    expect(pickSetsDone({}, { "f:chest:bench": 3 }, "새행id", "f:chest:bench")).toBe(3);
  });

  it("부위·운동이 다르면 이어받지 않는다", () => {
    expect(pickSetsDone({}, { "f:chest:bench": 3 }, "새행id", "f:back:row")).toBe(0);
  });

  it("키가 없으면 0", () => {
    expect(pickSetsDone({}, {}, "row1")).toBe(0);
    expect(pickSetsDone(undefined, undefined, "row1", "f:chest:bench")).toBe(0);
  });

  it("소수/음수는 정리한다", () => {
    expect(pickSetsDone({ row1: 2.7 }, {}, "row1")).toBe(2);
    expect(pickSetsDone({ row1: -1 }, { k: 2 }, "row1", "k")).toBe(2);
  });
});
