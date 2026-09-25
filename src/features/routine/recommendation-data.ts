import "server-only";
import { cache } from "react";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { getUserProfile } from "@/features/profile/data-access";
import { getRecentDoneRecords } from "./exercise-completions";
import { seoulYmd } from "./data";
import { defaultRecommendationPreferences, parseRecommendationPreferences, recentRecommendationRecords, type RecommendationContext } from "./recommendation-preferences";

export const getRecommendationContext = cache(async (): Promise<RecommendationContext | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  const db = await createSupabaseServerClient();
  const [profile, history, result] = await Promise.all([
    getUserProfile(), getRecentDoneRecords(),
    db.from("recommendation_preferences").select("days,minutes,priority,equipment,variety").eq("user_id", user.id).maybeSingle(),
  ]);
  if (!profile) return null;
  if (result.error) throw new Error("추천 설정을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
  const today = seoulYmd();
  const records = recentRecommendationRecords(history,today);
  const saved = parseRecommendationPreferences(result.data);
  return {gender:profile.gender,experience:profile.experience,goal:profile.goal,today,records,
    preferences:saved ?? defaultRecommendationPreferences(profile.gender,profile.experience,records,today),explicitPreferences:!!saved};
});