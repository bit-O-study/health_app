import { describe, expect, it } from "vitest";

import {
  isRunOnlyCooldownOverride,
  showsDailyCooldownBadge,
} from "@/features/routine/daily-override";

const item = (itemId: string) => ({ itemId });

describe("isRunOnlyCooldownOverride — 러닝 자동기록만 얹힌 오버라이드", () => {
  const defaults = [item("stretch-hamstring"), item("stretch-chest")];

  it("기본값 + 러닝 = true(러닝만 얹힘)", () => {
    const daily = [...defaults, item("running")];
    expect(isRunOnlyCooldownOverride(daily, defaults)).toBe(true);
  });

  it("러닝 행이 없으면 false", () => {
    expect(isRunOnlyCooldownOverride(defaults, defaults)).toBe(false);
  });

  it("기본값과 다른 스트레칭이 섞이면 false(수동 변경)", () => {
    const daily = [item("stretch-hamstring"), item("foam-roll"), item("running")];
    expect(isRunOnlyCooldownOverride(daily, defaults)).toBe(false);
  });

  it("기본값보다 항목 수가 다르면 false", () => {
    const daily = [item("stretch-hamstring"), item("running")];
    expect(isRunOnlyCooldownOverride(daily, defaults)).toBe(false);
  });

  it("기본이 비어있고 러닝만 있으면 true", () => {
    expect(isRunOnlyCooldownOverride([item("running")], [])).toBe(true);
  });
});

describe("showsDailyCooldownBadge — '오늘만' 표시 여부", () => {
  const defaults = [item("stretch-hamstring")];

  it("오버라이드 없으면 미표시", () => {
    expect(showsDailyCooldownBadge([], defaults)).toBe(false);
  });

  it("러닝만 얹힌 경우 미표시(오해 방지)", () => {
    expect(
      showsDailyCooldownBadge([...defaults, item("running")], defaults),
    ).toBe(false);
  });

  it("진짜 수동 변경이면 표시", () => {
    expect(showsDailyCooldownBadge([item("foam-roll")], defaults)).toBe(true);
  });
});