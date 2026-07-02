import { describe, expect, it } from "vitest";

import {
  CHEER_MAX,
  cheersByTarget,
  isValidCheer,
  normalizeCheer,
} from "@/features/groups/cheers";

describe("normalizeCheer", () => {
  it("collapses whitespace and trims", () => {
    expect(normalizeCheer("  화이팅   해   ")).toBe("화이팅 해");
  });
  it("caps at CHEER_MAX chars", () => {
    expect(normalizeCheer("12345678901234").length).toBe(CHEER_MAX);
  });
});

describe("isValidCheer", () => {
  it("rejects empty / whitespace", () => {
    expect(isValidCheer("")).toBe(false);
    expect(isValidCheer("   ")).toBe(false);
  });
  it("accepts 1..10 chars", () => {
    expect(isValidCheer("굿")).toBe(true);
    expect(isValidCheer("열심히하자좋아좋아")).toBe(true); // 9자
  });
  it("accepts even when raw is long (normalized to 10)", () => {
    expect(isValidCheer("12345678901234")).toBe(true);
  });
});

describe("cheersByTarget", () => {
  it("groups by target and flags mine, mine first", () => {
    const rows = [
      { toUser: "a", fromUser: "x", message: "화이팅" },
      { toUser: "a", fromUser: "me", message: "굿잡" },
      { toUser: "b", fromUser: "x", message: "최고" },
    ];
    const out = cheersByTarget(rows, "me");
    const a = out.get("a")!;
    expect(a).toHaveLength(2);
    expect(a[0].mine).toBe(true); // 내 응원이 앞으로
    expect(a[0].message).toBe("굿잡");
    expect(out.get("b")![0].mine).toBe(false);
  });
});
