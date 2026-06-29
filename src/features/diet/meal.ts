/** 식단 공용 타입·상수 — 서버/클라이언트 양쪽에서 import (server-only 아님). */

export type Meal = "breakfast" | "lunch" | "dinner" | "snack";

export const MEALS: Meal[] = ["breakfast", "lunch", "dinner", "snack"];

export const MEAL_LABEL: Record<Meal, string> = {
  breakfast: "아침",
  lunch: "점심",
  dinner: "저녁",
  snack: "간식",
};

/** 캐러셀 인덱스를 [0, len) 범위로 순환(음수·초과도 감싼다). len<=0이면 0. */
export function wrapIndex(i: number, len: number): number {
  if (len <= 0) return 0;
  return ((i % len) + len) % len;
}

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
  category: string | null;
  photoUrl: string | null;
  /** 먹은 시간 "HH:MM"(24h). 없으면 null. */
  eatenAt: string | null;
};
