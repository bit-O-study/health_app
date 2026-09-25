"use server";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { parseRecommendationPreferences, personalizedRoutine } from "./recommendation-preferences";
import { getRecommendationContext } from "./recommendation-data";
import { getCurrentGym } from "@/features/gym/gym-data-access";
import { toGymEquipmentSet } from "@/features/gym/gym-equipment-mapping";
import { routineDaySlots } from "./data";
import { allExercisesForSlot, focusExercisesForSlot, sideExercisesForSlot } from "./recommend";
import { personalizeExercises } from "./recommend-personalization";
import { saveRoutineAction } from "./actions";

export async function saveRecommendationPreferencesAction(input: unknown): Promise<{ok:boolean;error?:string}> {
  const user=await getCurrentUser();if(!user) return {ok:false,error:"로그인이 필요합니다."};
  const preferences=parseRecommendationPreferences(input);
  if(!preferences) return {ok:false,error:"추천 선호를 다시 확인해 주세요."};
  const db=await createSupabaseServerClient();
  const {error}=await db.from("recommendation_preferences").upsert({user_id:user.id,...preferences},{onConflict:"user_id"});
  if(error)return {ok:false,error:"추천 선호를 저장하지 못했어요. 다시 시도해 주세요."};
  revalidatePath("/settings/routine");revalidatePath("/plan");
  return {ok:true};
}

export async function applyPersonalizedRoutineAction(expectedWeek: unknown): Promise<{ok:boolean;error?:string}> {
  const context=await getRecommendationContext();
  if(!context)return {ok:false,error:"로그인과 프로필 설정이 필요합니다."};
  const recommendation=personalizedRoutine(context);
  if(JSON.stringify(expectedWeek)!==JSON.stringify(recommendation.week)) return {ok:false,error:"추천 조건이 바뀌었어요. 새로고침 후 구성을 확인해 주세요."};
  const gym=await getCurrentGym();const gymSet=toGymEquipmentSet(gym?.equipmentIds??null);
  for(const slot of routineDaySlots(0,"custom",recommendation.week)) {
    const base=slot.isSide ? sideExercisesForSlot(slot.focus,slot.blockIds,context.gender,gymSet) : focusExercisesForSlot(slot.focus,slot.blockIds,context.gender,gymSet);
    if(!personalizeExercises(base,allExercisesForSlot(slot.focus,slot.blockIds),gymSet,context,slot.isSide,slot.focus).length) return {ok:false,error:"보유 기구로 추천할 수 없는 부위가 있어요. 기구 설정을 확인해 주세요."};
  }
  return saveRoutineAction(0,"custom",recommendation.week,"recommend");
}