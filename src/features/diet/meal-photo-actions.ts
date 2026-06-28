"use server";

import { revalidatePath } from "next/cache";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { seoulYmd } from "@/features/routine/data";
import { MEALS, type Meal } from "@/features/diet/meal";

export type MealPhotoResult = { ok: true } | { ok: false; error: string };

/** 끼니 사진 설정/삭제(끼니당 1장). photoUrl 비우면 삭제. dateYmd 없으면 오늘. */
export async function setMealPhotoAction(
  meal: Meal,
  photoUrl: string | null,
  dateYmd?: string,
): Promise<MealPhotoResult> {
  if (!MEALS.includes(meal)) return { ok: false, error: "끼니 값이 올바르지 않습니다." };
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  const date = dateYmd ?? seoulYmd();

  const url = photoUrl?.trim() ?? "";
  if (!/^https?:\/\//.test(url)) {
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

  const { error } = await supabase.from("meal_photos").upsert(
    {
      user_id: user.id,
      for_date: date,
      meal,
      photo_url: url.slice(0, 500),
    },
    { onConflict: "user_id,for_date,meal" },
  );
  if (error) return { ok: false, error: error.message };
  revalidatePath("/diet");
  return { ok: true };
}
