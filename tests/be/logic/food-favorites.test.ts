import { describe, it, expect } from "vitest";
import { parseFavorite, favoriteKey } from "@/features/diet/favorites";
const food = { name: "계란", kcal: 80, protein: 6, carbs: null, fat: 5, amount: "1개", category: null, meal: "breakfast", date: "2026-09-28", eatenAt: "08:00" };
describe("account food favorites", () => {
  it("keeps nutrition and removes the old consumption time", () => {
    expect(parseFavorite(food)).toEqual({ ...food, eatenAt: null });
  });
  it("rejects malformed browser data and nonfinite nutrition", () => {
    for (const value of [null, [], {}, { ...food, kcal: Infinity }, { ...food, protein: -1 }, { ...food, meal: "bad" }]) expect(parseFavorite(value)).toBeNull();
  });
  it("does not collide when names or amounts contain separators", () => {
    expect(favoriteKey({name:"a|b",amount:"c"})).not.toBe(favoriteKey({name:"a",amount:"b|c"}));
  });
});
