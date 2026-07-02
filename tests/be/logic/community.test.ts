import { describe, expect, it } from "vitest";

import {
  MAX_CAPTION,
  postsForFilter,
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

describe("community — postsForFilter", () => {
  const posts = [
    { id: "1", groupId: null },
    { id: "2", groupId: "g1" },
    { id: "3", groupId: "g2" },
    { id: "4", groupId: "g1" },
  ];
  it("empty selection → nothing (전체 모드는 컴포넌트가 별도 처리)", () => {
    expect(postsForFilter(posts, [])).toEqual([]);
  });
  it("single group → only that group", () => {
    expect(postsForFilter(posts, ["g1"]).map((p) => p.id)).toEqual(["2", "4"]);
    expect(postsForFilter(posts, ["g2"]).map((p) => p.id)).toEqual(["3"]);
  });
  it("multiple groups → union (A그룹 + B그룹 둘 다)", () => {
    expect(postsForFilter(posts, ["g1", "g2"]).map((p) => p.id)).toEqual([
      "2",
      "3",
      "4",
    ]);
  });
  it("public posts are never included when filtering by groups", () => {
    expect(
      postsForFilter(posts, ["g1", "g2"]).some((p) => p.groupId === null),
    ).toBe(false);
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
