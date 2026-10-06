"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import type { PledgeActionResult } from "./pledge-actions";

export async function createGroupPledgeAction(input: {
  groupId: string; title: string; startDate: string; days: number;
  workoutDays: number | null; mealsPerDay: number | null;
}): Promise<PledgeActionResult> {
  if (!(await getCurrentUser())) return { ok: false, error: "로그인이 필요합니다." };
  if (!input.title.trim() || input.title.trim().length > 40) return { ok: false, error: "다짐 이름을 1~40자로 입력해 주세요." };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_group_pledge", {
    p_group_id: input.groupId, p_title: input.title.trim(), p_start_date: input.startDate,
    p_days: input.days, p_workout_days: input.workoutDays, p_meals_per_day: input.mealsPerDay,
  });
  if (error) return { ok: false, error: "저장하지 못했어요. 그룹장 권한과 기간·목표를 확인한 뒤 다시 시도해 주세요." };
  revalidatePath("/commitments/groups");
  return { ok: true, id: String(data) };
}
