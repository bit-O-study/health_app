import { describe, it, expect } from "vitest";
import {
  forTab,
  applyFeedFilter,
  feedTags,
  mergeByCreatedAt,
  resolveVisibility,
  visibilityLabel,
  EMPTY_FILTER,
  type FeedKind,
  type Visibility,
} from "@/features/community/feed";

type Item = {
  id: string;
  kind: FeedKind;
  visibility: Visibility;
  groupId: string | null;
  exerciseTag: string | null;
  createdAt: string;
};

const mk = (o: Partial<Item> & { id: string }): Item => ({
  kind: "photo",
  visibility: "public",
  groupId: null,
  exerciseTag: null,
  createdAt: "2026-07-06T00:00:00Z",
  ...o,
});

describe("forTab", () => {
  const items = [
    mk({ id: "pub", visibility: "public" }),
    mk({ id: "exc", visibility: "public_except_group", groupId: "g1" }),
    mk({ id: "g1", visibility: "group", groupId: "g1" }),
    mk({ id: "g2", visibility: "group", groupId: "g2" }),
  ];
  it("전체 탭 — 그룹전용 아닌 글(전체·그룹제외)", () => {
    const r = forTab(items, "all", []).map((i) => i.id);
    expect(r).toEqual(["pub", "exc"]);
  });
  it("그룹 탭 — 선택 그룹의 그룹전용 글만", () => {
    expect(forTab(items, "group", ["g1"]).map((i) => i.id)).toEqual(["g1"]);
    expect(forTab(items, "group", ["g1", "g2"]).map((i) => i.id)).toEqual(["g1", "g2"]);
    expect(forTab(items, "group", []).map((i) => i.id)).toEqual([]);
  });
});

describe("applyFeedFilter", () => {
  const items = [
    mk({ id: "photo1", kind: "photo" }),
    mk({ id: "sq", kind: "teaching", exerciseTag: "스쿼트" }),
    mk({ id: "bp", kind: "teaching", exerciseTag: "벤치프레스" }),
  ];
  it("기본(EMPTY_FILTER)은 전부", () => {
    expect(applyFeedFilter(items, EMPTY_FILTER).length).toBe(3);
  });
  it("scope teaching → 티칭만", () => {
    const r = applyFeedFilter(items, { scope: "teaching", hideTeaching: false, tags: [] });
    expect(r.map((i) => i.id)).toEqual(["sq", "bp"]);
  });
  it("hideTeaching → 티칭 제거", () => {
    const r = applyFeedFilter(items, { scope: "all", hideTeaching: true, tags: [] });
    expect(r.map((i) => i.id)).toEqual(["photo1"]);
  });
  it("태그 선택 → 그 태그 티칭만(사진 제외)", () => {
    const r = applyFeedFilter(items, { scope: "all", hideTeaching: false, tags: ["스쿼트"] });
    expect(r.map((i) => i.id)).toEqual(["sq"]);
  });
  it("여러 태그 선택 = 합집합", () => {
    const r = applyFeedFilter(items, { scope: "all", hideTeaching: false, tags: ["스쿼트", "벤치프레스"] });
    expect(r.map((i) => i.id)).toEqual(["sq", "bp"]);
  });
  it("태그는 공백·대소문자 무시 매칭", () => {
    const r = applyFeedFilter(items, { scope: "all", hideTeaching: false, tags: [" 스쿼트 "] });
    expect(r.map((i) => i.id)).toEqual(["sq"]);
  });
});

describe("feedTags", () => {
  it("티칭 태그를 빈도순으로", () => {
    const items = [
      mk({ id: "a", kind: "teaching", exerciseTag: "스쿼트" }),
      mk({ id: "b", kind: "teaching", exerciseTag: "스쿼트" }),
      mk({ id: "c", kind: "teaching", exerciseTag: "데드리프트" }),
      mk({ id: "d", kind: "photo" }),
    ];
    expect(feedTags(items)).toEqual(["스쿼트", "데드리프트"]);
  });
});

describe("mergeByCreatedAt", () => {
  it("작성시각 내림차순 병합", () => {
    const a = [mk({ id: "old", createdAt: "2026-07-01T00:00:00Z" })];
    const b = [mk({ id: "new", createdAt: "2026-07-06T00:00:00Z" })];
    expect(mergeByCreatedAt(a, b).map((i) => i.id)).toEqual(["new", "old"]);
  });
});

describe("resolveVisibility", () => {
  it("public → 그룹 무시", () => {
    expect(resolveVisibility("public", "g1")).toEqual({ ok: true, visibility: "public", groupId: null });
    expect(resolveVisibility(undefined, "g1")).toEqual({ ok: true, visibility: "public", groupId: null });
  });
  it("group/except → 그룹 필수", () => {
    expect(resolveVisibility("group", "g1")).toEqual({ ok: true, visibility: "group", groupId: "g1" });
    expect(resolveVisibility("public_except_group", "g1")).toEqual({
      ok: true,
      visibility: "public_except_group",
      groupId: "g1",
    });
    expect(resolveVisibility("group", null).ok).toBe(false);
    expect(resolveVisibility("public_except_group", null).ok).toBe(false);
  });
});

describe("visibilityLabel", () => {
  it("라벨", () => {
    expect(visibilityLabel("public")).toBe("전체 공개");
    expect(visibilityLabel("group")).toBe("그룹만 공개");
    expect(visibilityLabel("public_except_group")).toBe("그룹 제외 공개");
  });
});
