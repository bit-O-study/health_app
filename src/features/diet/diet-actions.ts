"use server";

import { revalidatePath } from "next/cache";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { seoulYmd } from "@/features/routine/data";
import type { Meal } from "@/features/diet/meal";

export type DietActionResult = { ok: true; id?: string } | { ok: false; error: string };

export type FoodInput = {
  meal: Meal;
  name: string;
  kcal: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  amount: string | null;
};

const MEALS = ["breakfast", "lunch", "dinner", "snack"];

function clampNum(v: number | null, max: number): number | null {
  if (v === null || !Number.isFinite(v)) return null;
  return Math.min(max, Math.max(0, v));
}

/** 식단 1건 추가(해당 날짜·끼니의 맨 뒤). dateYmd 없으면 오늘. */
export async function addFoodLogAction(
  input: FoodInput,
  dateYmd?: string,
): Promise<DietActionResult> {
  if (!MEALS.includes(input.meal)) return { ok: false, error: "끼니 값이 올바르지 않습니다." };
  const name = input.name.trim();
  if (!name) return { ok: false, error: "음식 이름을 입력하세요." };

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const date = dateYmd ?? seoulYmd();

  const { data: tail } = await supabase
    .from("food_logs")
    .select("position")
    .eq("user_id", user.id)
    .eq("for_date", date)
    .eq("meal", input.meal)
    .order("position", { ascending: false })
    .limit(1);
  const nextPos = ((tail?.[0]?.position as number | undefined) ?? -1) + 1;

  const { data, error } = await supabase
    .from("food_logs")
    .insert({
      user_id: user.id,
      for_date: date,
      meal: input.meal,
      position: nextPos,
      name: name.slice(0, 60),
      kcal: clampNum(input.kcal, 9000) ?? 0,
      protein_g: clampNum(input.protein, 2000),
      carbs_g: clampNum(input.carbs, 2000),
      fat_g: clampNum(input.fat, 2000),
      amount: input.amount?.trim().slice(0, 40) || null,
    })
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/diet");
  return { ok: true, id: (data as { id: string } | null)?.id };
}

/** 식단 1건 수정(영양값·양·이름). */
export async function updateFoodLogAction(
  id: string,
  patch: Partial<Omit<FoodInput, "meal">>,
): Promise<DietActionResult> {
  if (!id) return { ok: false, error: "기록을 찾을 수 없습니다." };
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const update: Record<string, unknown> = {};
  if (patch.name !== undefined) update.name = patch.name.trim().slice(0, 60);
  if (patch.kcal !== undefined) update.kcal = clampNum(patch.kcal, 9000) ?? 0;
  if (patch.protein !== undefined) update.protein_g = clampNum(patch.protein, 2000);
  if (patch.carbs !== undefined) update.carbs_g = clampNum(patch.carbs, 2000);
  if (patch.fat !== undefined) update.fat_g = clampNum(patch.fat, 2000);
  if (patch.amount !== undefined) update.amount = patch.amount?.trim().slice(0, 40) || null;

  const { error } = await supabase
    .from("food_logs")
    .update(update)
    .eq("user_id", user.id)
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/diet");
  return { ok: true };
}

/** 식단 1건 삭제. */
export async function deleteFoodLogAction(id: string): Promise<DietActionResult> {
  if (!id) return { ok: false, error: "기록을 찾을 수 없습니다." };
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const { error } = await supabase
    .from("food_logs")
    .delete()
    .eq("user_id", user.id)
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/diet");
  return { ok: true };
}
