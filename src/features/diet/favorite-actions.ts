"use server";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { favoriteKey, parseFavorite } from "./favorites";
import type { RecentFood } from "./quick-add";

export async function getFoodFavorites(): Promise<RecentFood[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const db = await createSupabaseServerClient();
  const { data, error } = await db.from("food_favorites").select("food").eq("user_id", user.id).order("created_at");
  if (error) throw new Error("즐겨찾기를 불러오지 못했어요.");
  return (data ?? []).map(row => parseFavorite(row.food)).filter((food): food is RecentFood => food !== null);
}
export async function saveFoodFavorite(input: unknown, remove = false) {
  const food = parseFavorite(input);
  if (!food) return { ok: false, error: "음식 정보가 올바르지 않아요." };
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요해요." };
  const db = await createSupabaseServerClient();
  const key = favoriteKey(food);
  const { error } = remove
    ? await db.from("food_favorites").delete().eq("user_id", user.id).eq("food_key", key)
    : await db.from("food_favorites").upsert({ user_id: user.id, food_key: key, food }, { onConflict: "user_id,food_key" });
  if (error) return { ok: false, error: "즐겨찾기를 저장하지 못했어요. 다시 시도해 주세요." };
  revalidatePath("/diet", "layout");
  return { ok: true };
}
