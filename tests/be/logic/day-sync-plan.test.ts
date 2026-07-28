import { describe, expect, it } from "vitest";

import {
  NULL_DAY_KEY,
  planFocusDaySync,
  planRoutineSlotRemap,
  type DaySyncOp,
} from "@/features/routine/day-sync-plan";

// 일차 동기화 계획 — 같은 부위가 여러 일차에 있을 때 본/보조를 뒤섞지 않는 게 핵심.

/** 모든 일차가 주(主) */
const allMain = () => false;

describe("planFocusDaySync", () => {
  it("양쪽 target 이 이미 채워져 있으면 아무 연산도 없다(멱등)", () => {
    // 등: 1일차(보조, idx0) + 2일차(본, idx1) 둘 다 행 있음
    const isSide = (d: number) => d === 0; // idx0=보조, idx1=본
    expect(planFocusDaySync([0, 1], [0, 1], isSide)).toEqual([]);
  });

  it("★ 본운동(idx1)만 있고 보조(idx0)가 비면 → 복사하지 않는다(교차 복사 금지)", () => {
    const isSide = (d: number) => d === 0; // idx0=보조, idx1=본
    const ops = planFocusDaySync([1], [0, 1], isSide);
    // idx0(보조)은 idx1(본)과 역할이 달라 복사 안 함 → 빈 채로 둠
    expect(ops).toEqual([]);
  });

  it("★ 보조(idx0)만 있고 본운동(idx1)이 비면 → 복사하지 않는다", () => {
    const isSide = (d: number) => d === 0;
    expect(planFocusDaySync([0], [0, 1], isSide)).toEqual([]);
  });

  it("같은 역할(PPL×2 — 둘 다 본운동)인데 한쪽만 있으면 복사로 채운다", () => {
    // push: 0일차·3일차 모두 본운동(isSide=false). 0만 채워짐 → 3으로 복사.
    const ops = planFocusDaySync([0], [0, 3], allMain);
    expect(ops).toEqual<DaySyncOp[]>([{ type: "copy", from: 0, to: 3 }]);
  });

  it("같은 arm 보조라도 이두와 삼두 슬롯끼리는 복사하지 않는다", () => {
    const slotRole = (day: number) =>
      day === 0 ? "side:biceps" : "side:triceps";
    expect(planFocusDaySync([0], [0, 1], slotRole)).toEqual([]);
  });

  it("이미 채워진 이두/삼두 날짜를 맞바꾸면 운동 묶음도 서로 이동한다", () => {
    const previous = [
      { dayIndex: 0, focus: "arm", blockIds: ["biceps"], isSide: true },
      { dayIndex: 1, focus: "arm", blockIds: ["triceps"], isSide: true },
    ];
    const next = [
      { dayIndex: 0, focus: "arm", blockIds: ["triceps"], isSide: true },
      { dayIndex: 1, focus: "arm", blockIds: ["biceps"], isSide: true },
    ];
    expect(planRoutineSlotRemap(previous, next)).toEqual([
      { focus: "arm", from: 0, to: 1 },
      { focus: "arm", from: 1, to: 0 },
    ]);
  });

  it("이두 슬롯이 삼두 슬롯으로 바뀌면 호환되지 않는 기존 arm 묶음을 제거한다", () => {
    const previous = [
      { dayIndex: 0, focus: "arm", blockIds: ["biceps"], isSide: false },
    ];
    const next = [
      { dayIndex: 0, focus: "arm", blockIds: ["triceps"], isSide: false },
    ];
    expect(planRoutineSlotRemap(previous, next)).toEqual([
      { focus: "arm", from: 0, to: null },
    ]);
  });

  it("legacy NULL 한 벌 → 첫 target 으로 이동 후 같은 역할 나머지로 복사", () => {
    // push NULL 한 벌, target=[0,3] 둘 다 본운동.
    const ops = planFocusDaySync([NULL_DAY_KEY], [0, 3], allMain);
    expect(ops).toEqual<DaySyncOp[]>([
      { type: "move", from: NULL_DAY_KEY, to: 0 },
      { type: "copy", from: 0, to: 3 },
    ]);
  });

  it("드리프트(target 아닌 일차)는 빈 target 으로 이동, 남으면 삭제", () => {
    // 행이 idx2 에만 있는데 루틴은 lower 를 idx0 에만 씀
    expect(planFocusDaySync([2], [0], allMain)).toEqual<DaySyncOp[]>([
      { type: "move", from: 2, to: 0 },
    ]);
    // 행이 idx1,2 두 곳, target 은 idx0 하나 → 하나는 이동, 하나는 삭제
    expect(planFocusDaySync([1, 2], [0], allMain)).toEqual<DaySyncOp[]>([
      { type: "move", from: 1, to: 0 },
      { type: "delete", from: 2 },
    ]);
  });

  it("루틴이 안 쓰는 부위(target 비어 있음)는 연산 없음", () => {
    expect(planFocusDaySync([0, 1], [], allMain)).toEqual([]);
  });

  it("본/보조 혼합에서 드리프트 이동은 하되 교차 복사는 안 한다", () => {
    // 행: idx2(드리프트). target: idx0(보조), idx1(본).
    // idx2 → 빈 target 중 첫 번째(idx0)로 이동. idx1(본)은 역할 다른 idx0 에서 복사 안 함.
    const isSide = (d: number) => d === 0;
    expect(planFocusDaySync([2], [0, 1], isSide)).toEqual<DaySyncOp[]>([
      { type: "move", from: 2, to: 0 },
    ]);
  });
});
