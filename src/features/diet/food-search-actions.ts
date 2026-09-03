"use server";

import { searchFoods } from "@/features/diet/food-catalog";
import type { FoodItem } from "@/features/diet/food-catalog-types";

/** 정적 식품 검색을 서버에서 실행해 120 KiB 카탈로그를 클라이언트에 싣지 않는다. */
export async function searchFoodsAction(query: string): Promise<FoodItem[]> {
  const safeQuery = typeof query === "string" ? query.slice(0, 100) : "";
  return searchFoods(safeQuery).slice(0, 200);
}
