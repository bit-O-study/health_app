import { describe, it, expect } from "vitest";
import {
  mergeByCreatedAt,
  resolveVisibility,
  type FeedKind,
  type Visibility,
} from "@/features/community/feed";

type Item = {
  id: string;
  kind: FeedKind;
  visibility: Visibility;
  groupId: string | null;
  exerciseTag: string | null;
  isMine: boolean;
  createdAt: string;
};

const mk = (o: Partial<Item> & { id: string }): Item => ({
  kind: "photo",
  visibility: "public",
  groupId: null,
  exerciseTag: null,
  isMine: false,
  createdAt: "2026-07-06T00:00:00Z",
  ...o,
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
