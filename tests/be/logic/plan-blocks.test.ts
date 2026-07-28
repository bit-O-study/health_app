import { describe, expect, it } from "vitest";

import {
  baseTonesOfBlocks,
  subBlocksForFocus,
  todayAddedBlocks,
} from "@/features/routine/plan-blocks";

describe("todayAddedBlocks — '오늘만 부위 추가' 기억은 오늘 하루만", () => {
  const TODAY = "2026-07-28";

  it("오늘 기록이면 블록 목록을 돌려준다", () => {
    expect(todayAddedBlocks(TODAY, TODAY, "arm,biceps")).toEqual([
      "arm",
      "biceps",
    ]);
  });

  it("어제 기록이면 무시한다(다음 루틴에 영향 없음 — 원칙 #2)", () => {
    expect(todayAddedBlocks(TODAY, "2026-07-27", "arm,biceps")).toEqual([]);
  });

  it("기록이 없으면 빈 목록", () => {
    expect(todayAddedBlocks(TODAY, null, null)).toEqual([]);
    expect(todayAddedBlocks(TODAY, TODAY, "")).toEqual([]);
  });

  it("모르는 값·휴식은 걸러낸다", () => {
    expect(todayAddedBlocks(TODAY, TODAY, "arm, 없는블록 ,rest")).toEqual([
      "arm",
    ]);
  });
});

describe("baseTonesOfBlocks — 세부근육도 큰 카테고리(부위)로 접는다", () => {
  it("이두/삼두는 '팔' 하나로", () => {
    expect(baseTonesOfBlocks(["biceps", "triceps"])).toEqual(["arm"]);
  });

  it("가슴 세부근육 여러 개도 '가슴' 하나", () => {
    expect(baseTonesOfBlocks(["chest-upper", "chest-lower"])).toEqual(["chest"]);
  });

  it("여러 부위는 순서대로 중복 없이", () => {
    expect(baseTonesOfBlocks(["chest-upper", "biceps", "chest"])).toEqual([
      "chest",
      "arm",
    ]);
  });

  it("모르는 값은 무시", () => {
    expect(baseTonesOfBlocks(["없는블록"])).toEqual([]);
  });
});

describe("subBlocksForFocus — 운동 목록을 좁히는 중분류만", () => {
  it("팔에서 이두만 골랐으면 이두만", () => {
    expect(subBlocksForFocus(["arm", "biceps"], "arm")).toEqual(["biceps"]);
  });

  it("다른 부위 블록은 안 섞인다", () => {
    expect(subBlocksForFocus(["biceps", "chest-upper"], "chest")).toEqual([
      "chest-upper",
    ]);
  });
});
