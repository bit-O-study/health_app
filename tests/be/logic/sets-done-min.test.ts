import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  minEditableSets,
  pickSetsDone,
  setsBelowDoneMessage,
} from "@/features/workout-timer/sets-done";

/**
 * 편집 화면 세트 하한 (2026-09-25 "3세트 완료했는데 3세트 이하로 줄일 수 있다 — 운동 취소 전까지 막아줘").
 * 운동모드(clampTotalSets)와 같은 규칙을 '오늘 할 운동' 연필 편집·'오늘만 운동 변경' 에도 적용한다.
 */
describe("minEditableSets", () => {
  it("완료한 세트가 없으면 하한은 1", () => {
    expect(minEditableSets(0, false, 4)).toBe(1);
  });

  it("3세트 완료했으면 3 아래로 못 줄인다", () => {
    expect(minEditableSets(3, false, 5)).toBe(3);
  });

  it("운동을 완료 처리했으면 지금 세트 수 아래로 못 줄인다(완료 취소 전까지)", () => {
    expect(minEditableSets(0, true, 4)).toBe(4);
    expect(minEditableSets(4, true, 4)).toBe(4);
  });

  it("완료 취소(세트 0, 완료 아님)하면 다시 1까지 줄일 수 있다", () => {
    expect(minEditableSets(0, false, 4)).toBe(1);
  });

  it("이상한 값이 와도 최소 1", () => {
    expect(minEditableSets(Number.NaN, false, Number.NaN)).toBe(1);
    expect(minEditableSets(-2, false, 3)).toBe(1);
    expect(minEditableSets(2.7, false, 3)).toBe(2);
  });

  it("행 id 가 없는 편집기(오늘만 변경)는 (부위:운동) 키로 완료 세트를 찾는다", () => {
    expect(pickSetsDone({}, { "f:chest:bench-press": 3 }, "", "f:chest:bench-press")).toBe(3);
  });

  it("안내 문구가 몇 세트인지와 풀어 주는 방법을 말한다", () => {
    expect(setsBelowDoneMessage(3, false)).toContain("3세트");
    expect(setsBelowDoneMessage(3, false)).toContain("취소");
    expect(setsBelowDoneMessage(4, true)).toContain("완료를 취소");
  });
});

describe("편집 화면이 이 하한을 쓴다(한 곳만 고치면 다른 경로로 빠진다)", () => {
  const read = (rel: string) => readFileSync(resolve(process.cwd(), rel), "utf8");

  it("오늘 할 운동 연필 편집(today-plan-list)", () => {
    const src = read("src/features/routine/components/today-plan-list.tsx");
    expect(src).toContain("minEditableSets(setsDone, exerciseDone, item.sets)");
    expect(src).toContain("exerciseDone={isDone}");
  });

  it("오늘만 운동 변경(daily-main-editor) → SetDetailsEditor minSets", () => {
    expect(read("src/features/routine/components/daily-main-editor.tsx")).toContain("minSets={hydrated ? getSetsDone(");
    expect(read("src/features/routine/components/set-details-editor.tsx")).toContain("min={Math.max(1, minSets)}");
  });
});
