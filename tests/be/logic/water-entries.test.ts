import { describe, expect, it } from "vitest";

import {
  WATER_ONE_MAX_ML,
  isValidOneShotMl,
  remainingBy,
  sinceLabel,
  timeLabel,
} from "@/features/diet/water";

/**
 * 수분 기록 리뉴얼(2026-09-25) — 하루 합계 한 숫자 → 마신 기록 하나하나.
 * 여기서는 화면이 쓰는 순수 계산만 본다(저장은 E2E 가 확인).
 */

describe("직접 입력 검증", () => {
  it("1ml 부터 3L 까지만 받는다", () => {
    expect(isValidOneShotMl(600)).toBe(true);
    expect(isValidOneShotMl(1)).toBe(true);
    expect(isValidOneShotMl(WATER_ONE_MAX_ML)).toBe(true);
  });

  it("🔴 0·음수·소수·한도 초과는 막는다 — 서버와 같은 기준", () => {
    expect(isValidOneShotMl(0)).toBe(false);
    expect(isValidOneShotMl(-200)).toBe(false);
    expect(isValidOneShotMl(120.5)).toBe(false);
    expect(isValidOneShotMl(WATER_ONE_MAX_ML + 1)).toBe(false);
    expect(isValidOneShotMl(Number.NaN)).toBe(false);
  });
});

describe("남은 양 — '무엇을 더 하면 되는지' 로 바꿔 말한다", () => {
  it("남은 ml 과 컵 잔 수를 같이 준다", () => {
    expect(remainingBy(800, 2000, 200)).toEqual({ ml: 1200, cups: 6 });
  });

  it("딱 떨어지지 않으면 올림 — 한 잔 모자라게 안내하지 않는다", () => {
    expect(remainingBy(850, 2000, 200)).toEqual({ ml: 1150, cups: 6 });
  });

  it("목표를 채웠으면 0", () => {
    expect(remainingBy(2200, 2000, 200)).toEqual({ ml: 0, cups: 0 });
  });
});

describe("마지막으로 마신 시각", () => {
  const base = Date.parse("2026-09-25T12:00:00+09:00");

  it("방금 · 분 · 시간 · 일", () => {
    expect(sinceLabel("2026-09-25T11:59:40+09:00", base)).toBe("방금");
    expect(sinceLabel("2026-09-25T11:40:00+09:00", base)).toBe("20분 전");
    expect(sinceLabel("2026-09-25T09:00:00+09:00", base)).toBe("3시간 전");
    expect(sinceLabel("2026-09-23T12:00:00+09:00", base)).toBe("2일 전");
  });

  it("이상한 값이면 빈 문자열 — 화면에 'NaN분 전' 이 뜨면 안 된다", () => {
    expect(sinceLabel("", base)).toBe("");
    expect(sinceLabel("어제", base)).toBe("");
  });

  it("시각은 한국 시간으로 표시한다", () => {
    expect(timeLabel("2026-09-25T06:20:00Z")).toContain("3:20");
    expect(timeLabel("nope")).toBe("");
  });
});
