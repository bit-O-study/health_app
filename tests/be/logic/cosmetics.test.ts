import { describe, expect, it } from "vitest";

import {
  COSMETICS,
  cosmetic,
  cosmeticsBySlot,
  isCosmeticSlot,
} from "@/features/groups/cosmetics";

describe("cosmetics catalog", () => {
  it("has unique ids", () => {
    const ids = COSMETICS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("all items have a valid slot + positive price + emoji", () => {
    for (const c of COSMETICS) {
      expect(isCosmeticSlot(c.slot)).toBe(true);
      expect(c.price).toBeGreaterThan(0);
      expect(c.emoji.length).toBeGreaterThan(0);
    }
  });
  it("lookups work", () => {
    expect(cosmetic("hat-crown")?.name).toBe("왕관");
    expect(cosmetic("nope")).toBeUndefined();
    expect(cosmeticsBySlot("hat").every((c) => c.slot === "hat")).toBe(true);
  });
  it("isCosmeticSlot rejects junk", () => {
    expect(isCosmeticSlot("back")).toBe(false);
  });
});
