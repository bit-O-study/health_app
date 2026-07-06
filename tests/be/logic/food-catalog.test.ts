import { describe, it, expect } from "vitest";
import {
  FOOD_ITEMS,
  FOOD_CATEGORIES,
  searchFoods,
  getFoodItem,
  normalizeFoodName,
  isKnownFood,
  mergeFoodResults,
  type FoodItem,
} from "@/features/diet/food-catalog";

const CUISINES = new Set(["한식", "양식", "중식", "일식", "아시아", "그외"]);

describe("food-catalog 무결성", () => {
  it("항목 수가 대폭 확장되어 있다(>= 600)", () => {
    expect(FOOD_ITEMS.length).toBeGreaterThanOrEqual(600);
  });

  it("id는 모두 유일하다", () => {
    const ids = FOOD_ITEMS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("이름(정규화)은 중복이 없다", () => {
    const names = FOOD_ITEMS.map((f) => normalizeFoodName(f.name));
    const dups = names.filter((n, i) => names.indexOf(n) !== i);
    expect(dups).toEqual([]);
  });

  it("category는 모두 허용된 값이다", () => {
    for (const f of FOOD_ITEMS) {
      expect(FOOD_CATEGORIES).toContain(f.category);
    }
  });

  it("cuisine은 없거나 허용된 값이다", () => {
    for (const f of FOOD_ITEMS) {
      if (f.cuisine !== undefined) expect(CUISINES.has(f.cuisine)).toBe(true);
    }
  });

  it("영양값은 kcal>=0, 매크로>=0 이다(제로칼로리 음료 허용)", () => {
    for (const f of FOOD_ITEMS) {
      expect(f.kcal).toBeGreaterThanOrEqual(0);
      expect(f.protein).toBeGreaterThanOrEqual(0);
      expect(f.carbs).toBeGreaterThanOrEqual(0);
      expect(f.fat).toBeGreaterThanOrEqual(0);
      expect(f.amount.trim().length).toBeGreaterThan(0);
    }
  });

  it("세계 음식이 실제로 포함된다(양·중·일·아시아)", () => {
    const names = FOOD_ITEMS.map((f) => f.name);
    expect(names).toContain("양장피"); // 중식
    expect(names).toContain("감바스"); // 양식
    expect(names).toContain("전복내장파스타"); // 양식
    expect(names).toContain("팟타이"); // 아시아
    expect(names).toContain("초밥"); // 한식 카탈로그의 초밥(기존)
  });
});

describe("searchFoods", () => {
  it("이름 부분일치로 찾는다", () => {
    const r = searchFoods("김치찌개");
    expect(r.some((f) => f.name === "김치찌개")).toBe(true);
  });

  it("cuisine 키워드로도 찾는다", () => {
    const r = searchFoods("중식");
    expect(r.length).toBeGreaterThan(10);
    expect(r.every((f) => f.cuisine === "중식" || f.category.includes("중"))).toBe(true);
  });

  it("빈 검색어는 전체를 반환한다", () => {
    expect(searchFoods("").length).toBe(FOOD_ITEMS.length);
  });

  it("getFoodItem은 id로 항목을 돌려준다", () => {
    const first = FOOD_ITEMS[0];
    expect(getFoodItem(first.id)?.id).toBe(first.id);
    expect(getFoodItem("__none__")).toBeUndefined();
  });
});

describe("normalizeFoodName / isKnownFood / mergeFoodResults", () => {
  it("정규화는 공백 제거 + 소문자", () => {
    expect(normalizeFoodName("  뼈 해장국 ")).toBe("뼈해장국");
    expect(normalizeFoodName("Pad Thai")).toBe("padthai");
  });

  it("카탈로그에 있는 음식은 known", () => {
    expect(isKnownFood("김치찌개")).toBe(true);
    expect(isKnownFood(" 김치 찌개 ")).toBe(true);
    expect(isKnownFood("존재하지않는음식XYZ")).toBe(false);
  });

  it("병합은 정규화 이름 기준 중복 제거(base 우선)", () => {
    const base: FoodItem[] = [
      { id: "a", name: "김치찌개", category: "국·찌개", amount: "1", kcal: 1, protein: 0, carbs: 0, fat: 0 },
    ];
    const extra: FoodItem[] = [
      { id: "b", name: " 김치 찌개 ", category: "국·찌개", amount: "1", kcal: 9, protein: 0, carbs: 0, fat: 0 },
      { id: "c", name: "신규음식", category: "국·찌개", amount: "1", kcal: 5, protein: 0, carbs: 0, fat: 0 },
    ];
    const merged = mergeFoodResults(base, extra);
    expect(merged.map((f) => f.id)).toEqual(["a", "c"]);
  });
});