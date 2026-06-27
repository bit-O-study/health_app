/** 식단 공용 타입·상수 — 서버/클라이언트 양쪽에서 import (server-only 아님). */

export type Meal = "breakfast" | "lunch" | "dinner" | "snack";

export const MEALS: Meal[] = ["breakfast", "lunch", "dinner", "snack"];

export const MEAL_LABEL: Record<Meal, string> = {
  breakfast: "아침",
  lunch: "점심",
  dinner: "저녁",
  snack: "간식",
};

export type FoodLog = {
  id: string;
  meal: Meal;
  position: number;
  name: string;
  kcal: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  amount: string | null;
};
