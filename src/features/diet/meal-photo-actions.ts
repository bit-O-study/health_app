"use server";

import { revalidatePath } from "next/cache";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { seoulYmd } from "@/features/routine/data";
import { MEALS, type Meal } from "@/features/diet/meal";

export type MealPhotoResult = { ok: true } | { ok: false; error: string };

/** 끼니 사진 1장 추가(맨 뒤에). 끼니당 여러 장 가능. dateYmd 없으면 오늘. */
export async function addMealPhotoAction(
  meal: Meal,
  photoUrl: string,
  dateYmd?: string,
): Promise<MealPhotoResult> {
  if (!MEALS.includes(meal)) return { ok: false, error: "끼니 값이 올바르지 않습니다." };
  const url = photoUrl?.trim() ?? "";
  if (!/^https?:\/\//.test(url)) return { ok: false, error: "사진 주소가 올바르지 않습니다." };

  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  const date = dateYmd ?? seoulYmd();

  const { data: tail } = await supabase
    .from("meal_photos")
    .select("position")
    .eq("user_id", user.id)
    .eq("for_date", date)
    .eq("meal", meal)
    .order("position", { ascending: false })
    .limit(1);
  const nextPos = ((tail?.[0]?.position as number | undefined) ?? -1) + 1;

  const { error } = await supabase.from("meal_photos").insert({
    user_id: user.id,
    for_date: date,
    meal,
    photo_url: url.slice(0, 500),
    position: nextPos,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/diet");
  return { ok: true };
}

/** 끼니 사진 1장 삭제(URL 기준). dateYmd 없으면 오늘. */
export async function removeMealPhotoAction(
  meal: Meal,
  photoUrl: string,
  dateYmd?: string,
): Promise<MealPhotoResult> {
  if (!MEALS.includes(meal)) return { ok: false, error: "끼니 값이 올바르지 않습니다." };
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  const date = dateYmd ?? seoulYmd();

  const { error } = await supabase
    .from("meal_photos")
    .delete()
    .eq("user_id", user.id)
    .eq("for_date", date)
    .eq("meal", meal)
    .eq("photo_url", photoUrl);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/diet");
  return { ok: true };
}

/** 끼니의 모든 사진 삭제(게시물 통째 삭제 시). dateYmd 없으면 오늘. */
export async function clearMealPhotosAction(
  meal: Meal,
  dateYmd?: string,
): Promise<MealPhotoResult> {
  if (!MEALS.includes(meal)) return { ok: false, error: "끼니 값이 올바르지 않습니다." };
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  const date = dateYmd ?? seoulYmd();

  const { error } = await supabase
    .from("meal_photos")
    .delete()
    .eq("user_id", user.id)
    .eq("for_date", date)
    .eq("meal", meal);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/diet");
  return { ok: true };
}
