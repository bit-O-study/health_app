import { describe, expect, it } from "vitest";

import { parseMealScan } from "@/features/diet/meal-scan-parse";

describe("parseMealScan", () => {
  it("parses meal + items from clean JSON", () => {
    const r = parseMealScan(
      JSON.stringify({
        meal: "lunch",
        items: [
          { name: "닭가슴살", amount: "150g", kcal: 165, protein: 31, carbs: 0, fat: 3.6 },
          { name: "현미밥", amount: "210g", kcal: 310, protein: 6, carbs: 68, fat: 2 },
        ],
      }),
    );
    expect(r.meal).toBe("lunch");
    expect(r.items).toHaveLength(2);
    expect(r.items[0]).toEqual({
      name: "닭가슴살",
      amount: "150g",
      kcal: 165,
      protein: 31,
      carbs: 0,
      fat: 3.6,
    });
  });

  it("pulls JSON out of prose/code fences", () => {
    const r = parseMealScan(
      '분석 결과입니다:\n```json\n{"meal":"snack","items":[{"name":"사과","kcal":52}]}\n```\n끝',
    );
    expect(r.meal).toBe("snack");
    expect(r.items[0].name).toBe("사과");
    expect(r.items[0].kcal).toBe(52);
  });

  it("accepts `foods` and `_g` suffixed macros", () => {
    const r = parseMealScan(
      JSON.stringify({
        meal: "dinner",
        foods: [{ name: "계란", protein_g: 6, carbs_g: 0.6, fat_g: 5, kcal: 78 }],
      }),
    );
    expect(r.items[0]).toMatchObject({ protein: 6, carbs: 0.6, fat: 5 });
  });

  it("nulls invalid meal, clamps negatives, defaults missing kcal to 0", () => {
    const r = parseMealScan(
      JSON.stringify({
        meal: "브런치",
        items: [{ name: "미상", kcal: -50, protein: "abc" }],
      }),
    );
    expect(r.meal).toBeNull();
    expect(r.items[0].kcal).toBe(0);
    expect(r.items[0].protein).toBeNull();
  });

  it("drops items with no name and clamps oversized numbers", () => {
    const r = parseMealScan(
      JSON.stringify({
        items: [
          { name: "", kcal: 100 },
          { name: "폭탄", kcal: 999999, protein: 99999 },
        ],
      }),
    );
    expect(r.items).toHaveLength(1);
    expect(r.items[0].kcal).toBe(9000);
    expect(r.items[0].protein).toBe(2000);
  });

  it("returns empty on garbage / non-food", () => {
    expect(parseMealScan("음식이 아닙니다").items).toHaveLength(0);
    expect(parseMealScan('{"meal":"lunch","items":[]}').items).toHaveLength(0);
  });
});
