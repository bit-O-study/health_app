import { describe, expect, it } from "vitest";

import {
  categoryFromCode,
  isWeatherCategory,
  readFreshWeatherCache,
} from "@/features/home/weather-cache";

describe("categoryFromCode", () => {
  it("WMO 코드를 카테고리로 매핑", () => {
    expect(categoryFromCode(0)).toBe("clear");
    expect(categoryFromCode(3)).toBe("clouds");
    expect(categoryFromCode(48)).toBe("fog");
    expect(categoryFromCode(63)).toBe("rain");
    expect(categoryFromCode(73)).toBe("snow");
    expect(categoryFromCode(95)).toBe("thunder");
  });

  it("알 수 없는 코드는 기본값 clouds", () => {
    expect(categoryFromCode(999)).toBe("clouds");
  });
});

describe("isWeatherCategory", () => {
  it("유효한 카테고리만 true", () => {
    expect(isWeatherCategory("rain")).toBe(true);
    expect(isWeatherCategory("hurricane")).toBe(false);
    expect(isWeatherCategory(123)).toBe(false);
  });
});

// 홈에 다시 올 때마다 위치 권한 협상 + Open-Meteo 호출을 반복하지 않도록 하는
// 세션 캐시 신선도 검사 — 최적화(#34)의 핵심 로직.
describe("readFreshWeatherCache", () => {
  const now = 1_000_000;
  const freshMs = 20 * 60 * 1000;

  it("null/빈 값이면 null(캐시 없음)", () => {
    expect(readFreshWeatherCache(null, now, freshMs)).toBe(null);
    expect(readFreshWeatherCache("", now, freshMs)).toBe(null);
  });

  it("깨진 JSON 이면 null", () => {
    expect(readFreshWeatherCache("{not json", now, freshMs)).toBe(null);
  });

  it("category 가 유효하지 않으면 null", () => {
    expect(
      readFreshWeatherCache(JSON.stringify({ category: "hurricane", ts: now }), now, freshMs),
    ).toBe(null);
  });

  it("ts 가 숫자가 아니면 null", () => {
    expect(
      readFreshWeatherCache(JSON.stringify({ category: "rain", ts: "x" }), now, freshMs),
    ).toBe(null);
  });

  it("★ freshMs 이내면 캐시된 카테고리 반환", () => {
    const raw = JSON.stringify({ category: "rain", ts: now - 1000 });
    expect(readFreshWeatherCache(raw, now, freshMs)).toBe("rain");
  });

  it("★ freshMs 를 넘겼으면 null(다시 조회해야 함)", () => {
    const raw = JSON.stringify({ category: "rain", ts: now - freshMs - 1 });
    expect(readFreshWeatherCache(raw, now, freshMs)).toBe(null);
  });
});
