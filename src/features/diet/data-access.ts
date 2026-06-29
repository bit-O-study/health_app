import "server-only";

import { cache } from "react";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { type FoodLog, type Meal } from "@/features/diet/meal";

export { MEALS, MEAL_LABEL } from "@/features/diet/meal";
export type { Meal, FoodLog } from "@/features/diet/meal";

type Row = {
  id: string;
  meal: string;
  position: number;
  name: string;
  kcal: number | string;
  protein_g: number | string | null;
  carbs_g: number | string | null;
  fat_g: number | string | null;
  amount: string | null;
  category: string | null;
  photo_url: string | null;
  eaten_at: string | null;
};

const num = (v: number | string | null): number | null => {
  if (v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function isMeal(v: string): v is Meal {
  return v === "breakfast" || v === "lunch" || v === "dinner" || v === "snack";
}

/** 특정 날짜의 식단 기록(끼니·순서대로). */
export const getFoodLogsForDate = cache(async function getFoodLogsForDate(
  dateYmd: string,
): Promise<FoodLog[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("food_logs")
    .select("id, meal, position, name, kcal, protein_g, carbs_g, fat_g, amount, category, photo_url, eaten_at")
    .eq("user_id", user.id)
    .eq("for_date", dateYmd)
    .order("meal", { ascending: true })
    .order("position", { ascending: true });

  if (error || !data) return [];
  return (data as Row[])
    .filter((r) => isMeal(r.meal))
    .map((r) => ({
      id: r.id,
      meal: r.meal as Meal,
      position: r.position,
      name: r.name,
      kcal: num(r.kcal) ?? 0,
      protein: num(r.protein_g),
      carbs: num(r.carbs_g),
      fat: num(r.fat_g),
      amount: r.amount,
      category: r.category,
      photoUrl: r.photo_url,
      eatenAt: r.eaten_at ? r.eaten_at.slice(0, 5) : null,
    }));
});

/** 끼니별 사진 목록(등록 순서). 배열 첫 번째가 대표사진. */
export type MealPhotos = Record<Meal, string[]>;

const emptyMealPhotos = (): MealPhotos => ({
  breakfast: [],
  lunch: [],
  dinner: [],
  snack: [],
});

function isMealKey(v: string): v is Meal {
  return v === "breakfast" || v === "lunch" || v === "dinner" || v === "snack";
}

/** 특정 날짜의 끼니별 사진 목록 — position·created_at 오름차순(먼저 등록한 게 대표). */
export const getMealPhotosForDate = cache(async function getMealPhotosForDate(
  dateYmd: string,
): Promise<MealPhotos> {
  const user = await getCurrentUser();
  if (!user) return emptyMealPhotos();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("meal_photos")
    .select("meal, photo_url, position, created_at")
    .eq("user_id", user.id)
    .eq("for_date", dateYmd)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  const out = emptyMealPhotos();
  for (const r of (data ?? []) as { meal: string; photo_url: string }[]) {
    if (isMealKey(r.meal)) out[r.meal].push(r.photo_url);
  }
  return out;
});
