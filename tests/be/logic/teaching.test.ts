import { describe, it, expect } from "vitest";

import {
  validateTeachingPost,
  normalizeTag,
  filterByTag,
  popularTags,
  MAX_TEACHING_CAPTION,
} from "@/features/teaching/teaching";

describe("normalizeTag", () => {
  it("앞뒤 공백 제거 + 연속 공백 하나로", () => {
    expect(normalizeTag("  스쿼트  ")).toBe("스쿼트");
    expect(normalizeTag("벤치   프레스")).toBe("벤치 프레스");
    expect(normalizeTag("")).toBe("");
  });
});

describe("validateTeachingPost", () => {
  it("영상 URL 이 없거나 형식이 틀리면 실패", () => {
    expect(validateTeachingPost({ videoUrl: "", exerciseTag: "스쿼트", caption: "" }).ok).toBe(false);
    expect(validateTeachingPost({ videoUrl: "abc", exerciseTag: "스쿼트", caption: "" }).ok).toBe(false);
  });

  it("태그가 비면 실패", () => {
    const r = validateTeachingPost({ videoUrl: "https://x/v.mp4", exerciseTag: "  ", caption: "" });
    expect(r.ok).toBe(false);
  });

  it("캡션 길이 초과면 실패", () => {
    const r = validateTeachingPost({
      videoUrl: "https://x/v.mp4",
      exerciseTag: "스쿼트",
      caption: "가".repeat(MAX_TEACHING_CAPTION + 1),
    });
    expect(r.ok).toBe(false);
  });

  it("정상 입력이면 통과", () => {
    expect(
      validateTeachingPost({ videoUrl: "https://x/v.mp4", exerciseTag: "스쿼트", caption: "무릎 방향" }).ok,
    ).toBe(true);
  });
});

describe("filterByTag", () => {
  const posts = [
    { exerciseTag: "스쿼트" },
    { exerciseTag: "벤치프레스" },
    { exerciseTag: "바벨 스쿼트" },
  ];
  it("대소문자·공백 무시 부분일치", () => {
    expect(filterByTag(posts, "스쿼트").length).toBe(2);
    expect(filterByTag(posts, "벤치 프레스").length).toBe(1);
  });
  it("빈 검색어면 전체", () => {
    expect(filterByTag(posts, "").length).toBe(3);
  });
});

describe("popularTags", () => {
  it("빈도 높은 순으로 태그 집계", () => {
    const posts = [
      { exerciseTag: "스쿼트" },
      { exerciseTag: "스쿼트" },
      { exerciseTag: "벤치프레스" },
    ];
    const tags = popularTags(posts);
    expect(tags[0]).toBe("스쿼트");
    expect(tags).toContain("벤치프레스");
  });
});