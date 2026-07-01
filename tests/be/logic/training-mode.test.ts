import { describe, expect, it } from "vitest";

import {
  isTrainingMode,
  MODE_HREF,
} from "@/features/profile/training-mode-shared";

// 학습 모드 값 검증/라우팅 — 쿠키·DB 에서 읽은 값을 리다이렉트에 쓰기 전 안전하게 가린다.

describe("isTrainingMode", () => {
  it("유효 모드만 true", () => {
    expect(isTrainingMode("routine")).toBe(true);
    expect(isTrainingMode("powerlifting")).toBe(true);
  });
  it("그 외/빈값/타입불일치는 false (엉뚱한 쿠키값으로 리다이렉트 금지)", () => {
    expect(isTrainingMode("")).toBe(false);
    expect(isTrainingMode("routineX")).toBe(false);
    expect(isTrainingMode(null)).toBe(false);
    expect(isTrainingMode(undefined)).toBe(false);
    expect(isTrainingMode(1)).toBe(false);
  });
});

describe("MODE_HREF", () => {
  it("모드 → 목적지 경로", () => {
    expect(MODE_HREF.routine).toBe("/routine");
    expect(MODE_HREF.powerlifting).toBe("/powerlifting");
  });
});
