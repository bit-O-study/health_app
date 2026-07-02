import { describe, expect, it } from "vitest";

import {
  avatarColorClass,
  memberInitial,
  relativeBarPct,
} from "@/features/groups/avatar";

describe("memberInitial", () => {
  it("first char uppercased", () => {
    expect(memberInitial("chulsoo")).toBe("C");
    expect(memberInitial("철수")).toBe("철");
  });
  it("trims and handles empty", () => {
    expect(memberInitial("  민지 ")).toBe("민");
    expect(memberInitial("")).toBe("?");
    expect(memberInitial("   ")).toBe("?");
  });
});

describe("avatarColorClass", () => {
  it("is deterministic per name", () => {
    expect(avatarColorClass("철수")).toBe(avatarColorClass("철수"));
  });
  it("returns a palette class", () => {
    expect(avatarColorClass("영희")).toMatch(/^bg-[a-z]+-500$/);
  });
});

describe("relativeBarPct", () => {
  it("1위는 100%", () => {
    expect(relativeBarPct(1000, 1000)).toBe(100);
  });
  it("비율 계산 + 최소 4% 바닥", () => {
    expect(relativeBarPct(500, 1000)).toBe(50);
    expect(relativeBarPct(1, 1000)).toBe(4); // 아주 작아도 최소 4
  });
  it("0/음수 방어", () => {
    expect(relativeBarPct(0, 1000)).toBe(0);
    expect(relativeBarPct(500, 0)).toBe(0);
  });
});
