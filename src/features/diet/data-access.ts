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
    .select("id, meal, position, name, kcal, protein_g, carbs_g, fat_g, amount, category, photo_url")
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
    }));
});

export type MealPhotos = Record<Meal, string | null>;

const EMPTY_MEAL_PHOTOS: MealPhotos = {
  breakfast: null,
  lunch: null,
  dinner: null,
  snack: null,
};

function isMealKey(v: string): v is Meal {
  return v === "breakfast" || v === "lunch" || v === "dinner" || v === "snack";
}

/** 특정 날짜의 끼니별 사진(아침/점심/저녁/간식). */
export const getMealPhotosForDate = cache(async function getMealPhotosForDate(
  dateYmd: string,
): Promise<MealPhotos> {
  const user = await getCurrentUser();
  if (!user) return { ...EMPTY_MEAL_PHOTOS };
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("meal_photos")
    .select("meal, photo_url")
    .eq("user_id", user.id)
    .eq("for_date", dateYmd);
  const out: MealPhotos = { ...EMPTY_MEAL_PHOTOS };
  for (const r of (data ?? []) as { meal: string; photo_url: string }[]) {
    if (isMealKey(r.meal)) out[r.meal] = r.photo_url;
  }
  return out;
});
