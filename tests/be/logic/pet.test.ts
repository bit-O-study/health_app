import { describe, expect, it } from "vitest";

import {
  earnedPoints,
  petLevel,
  petStage,
  POINTS_PER_WORKOUT,
} from "@/features/pet/level";
import {
  ROOM_ITEMS,
  floorClass,
  isRoomCat,
  itemsByCat,
  roomItem,
  wallClass,
} from "@/features/pet/catalog";

describe("petLevel", () => {
  it("starts at level 1 with 0 workouts", () => {
    const l = petLevel(0);
    expect(l.level).toBe(1);
    expect(l.xp).toBe(0);
    expect(l.pct).toBe(0);
  });
  it("levels up on thresholds (3,5,7…)", () => {
    expect(petLevel(2).level).toBe(1);
    expect(petLevel(3).level).toBe(2); // 3회 → Lv2
    expect(petLevel(8).level).toBe(3); // 3+5 → Lv3
    expect(petLevel(15).level).toBe(4); // 3+5+7 → Lv4
  });
  it("intoLevel + pct within a level", () => {
    const l = petLevel(4); // Lv2 시작(3) + 1
    expect(l.level).toBe(2);
    expect(l.intoLevel).toBe(1);
    expect(l.need).toBe(5);
    expect(l.pct).toBe(20);
  });
  it("handles junk input", () => {
    expect(petLevel(-5).level).toBe(1);
    expect(petLevel(NaN).xp).toBe(0);
  });
});

describe("petStage", () => {
  it("grows title/scale by level band", () => {
    expect(petStage(1).title).toBe("아기 늑대");
    expect(petStage(3).title).toBe("늑대");
    expect(petStage(20).scale).toBeGreaterThan(petStage(1).scale);
  });
});

describe("earnedPoints", () => {
  it("points scale with workouts", () => {
    expect(earnedPoints(5)).toBe(5 * POINTS_PER_WORKOUT);
    expect(earnedPoints(0)).toBe(0);
  });
});

describe("room catalog", () => {
  it("item ids are unique", () => {
    const ids = ROOM_ITEMS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("all items have a valid category + non-negative price", () => {
    for (const i of ROOM_ITEMS) {
      expect(isRoomCat(i.cat)).toBe(true);
      expect(i.price).toBeGreaterThanOrEqual(0);
    }
  });
  it("wall/floor have className, at least one free default each", () => {
    for (const c of ["wall", "floor"] as const) {
      const items = itemsByCat(c);
      expect(items.every((i) => !!i.className)).toBe(true);
      expect(items.some((i) => i.price === 0)).toBe(true);
    }
  });
  it("roomItem / itemsByCat lookups", () => {
    expect(roomItem("decor-bed")?.name).toBe("늑대 침대");
    expect(roomItem("nope")).toBeUndefined();
    expect(itemsByCat("decor").every((i) => i.cat === "decor")).toBe(true);
  });
  it("wallClass/floorClass fall back to a default class", () => {
    expect(wallClass(undefined)).toMatch(/bg-/);
    expect(floorClass("nope")).toMatch(/bg-/);
    expect(wallClass("wall-night")).toContain("indigo");
  });
});
