import { describe, expect, it } from "vitest";

import {
  MAX_CAPTION,
  relativeTime,
  validatePostInput,
} from "@/features/community/community";

describe("community — validatePostInput", () => {
  it("requires a photo url", () => {
    const r = validatePostInput({ photoUrl: "", caption: "gg" });
    expect(r.ok).toBe(false);
  });
  it("rejects non-http url", () => {
    const r = validatePostInput({ photoUrl: "data:xxx", caption: "" });
    expect(r.ok).toBe(false);
  });
  it("rejects over-long caption", () => {
    const r = validatePostInput({
      photoUrl: "https://x/y.jpg",
      caption: "a".repeat(MAX_CAPTION + 1),
    });
    expect(r.ok).toBe(false);
  });
  it("accepts a valid post", () => {
    expect(
      validatePostInput({ photoUrl: "https://x/y.jpg", caption: "오운완" }).ok,
    ).toBe(true);
    // caption is optional
    expect(
      validatePostInput({ photoUrl: "http://x/y.png", caption: "" }).ok,
    ).toBe(true);
  });
});

describe("community — relativeTime", () => {
  const now = 1_000_000_000_000;
  const min = 60_000;
  it("under a minute → 방금 전", () => {
    expect(relativeTime(now - 30_000, now)).toBe("방금 전");
  });
  it("minutes", () => {
    expect(relativeTime(now - 5 * min, now)).toBe("5분 전");
  });
  it("hours", () => {
    expect(relativeTime(now - 3 * 60 * min, now)).toBe("3시간 전");
  });
  it("days", () => {
    expect(relativeTime(now - 2 * 24 * 60 * min, now)).toBe("2일 전");
  });
  it("weeks", () => {
    expect(relativeTime(now - 15 * 24 * 60 * min, now)).toBe("2주 전");
  });
  it("future/clock-skew clamps to 방금 전", () => {
    expect(relativeTime(now + 10_000, now)).toBe("방금 전");
  });
});
