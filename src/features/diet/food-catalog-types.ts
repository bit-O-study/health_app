export type FoodCategory =
  | "밥·면" | "국·찌개" | "고기·계란" | "생선·해산물" | "채소·반찬"
  | "과일" | "유제품" | "빵·간식" | "음료" | "단백질·보충" | "기타";

export type Cuisine = "한식" | "양식" | "중식" | "일식" | "아시아" | "그외";

export type FoodItem = {
  id: string;
  name: string;
  category: FoodCategory;
  cuisine?: Cuisine;
  amount: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

export const FOOD_CATEGORIES: FoodCategory[] = [
  "밥·면", "국·찌개", "고기·계란", "생선·해산물", "채소·반찬", "과일",
  "유제품", "빵·간식", "음료", "단백질·보충", "기타",
];

export function normalizeFoodName(name: string): string {
  return (name ?? "").trim().toLowerCase().replace(/\s+/g, "");
}

export function mergeFoodResults(base: FoodItem[], extra: FoodItem[]): FoodItem[] {
  const seen = new Set(base.map((food) => normalizeFoodName(food.name)));
  const out = [...base];
  for (const food of extra) {
    const normalized = normalizeFoodName(food.name);
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      out.push(food);
    }
  }
  return out;
}
