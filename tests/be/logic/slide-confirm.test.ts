import { describe, expect, it } from "vitest";

import {
  SLIDE_THRESHOLD,
  clampSlide,
  slideCompletes,
} from "@/features/workout-timer/slide-confirm";

// 운동모드 '밀어서 완료' — 터치는 끝까지 밀어야, 마우스·키보드는 바로.
describe("slideCompletes", () => {
  it("터치로 살짝 스치기만 하면 완료가 아니다(오누름 방지)", () => {
    expect(slideCompletes("touch", 0, 200)).toBe(false);
    expect(slideCompletes("touch", 60, 200)).toBe(false);
  });

  it("터치로 임계 이상 밀면 완료", () => {
    expect(slideCompletes("touch", 200 * SLIDE_THRESHOLD, 200)).toBe(true);
    expect(slideCompletes("pen", 500, 200)).toBe(true);
  });

  it("왼쪽으로 밀면 완료가 아니다", () => {
    expect(slideCompletes("touch", -300, 200)).toBe(false);
  });

  it("마우스 클릭·키보드는 바로 완료(데스크톱·접근성)", () => {
    expect(slideCompletes("mouse", 0, 200)).toBe(true);
    expect(slideCompletes("keyboard", 0, 0)).toBe(true);
  });

  it("트랙 폭을 모르면(0) 터치는 완료로 치지 않는다", () => {
    expect(slideCompletes("touch", 100, 0)).toBe(false);
  });
});

describe("clampSlide", () => {
  it("0 ~ 최대 이동폭으로 자른다", () => {
    expect(clampSlide(-10, 100)).toBe(0);
    expect(clampSlide(50, 100)).toBe(50);
    expect(clampSlide(150, 100)).toBe(100);
    expect(clampSlide(Number.NaN, 100)).toBe(0);
  });
});
