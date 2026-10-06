"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { seoulYmd } from "@/features/routine/data";
import { resolvePlan } from "@/features/billing/plan-store";
import { oneRMSeries } from "@/features/routine/progress";
import { goalLimit, goalProgress, validateGoalInput } from "@/features/lite/goal-progress";
import { latestOneRm, loadLiftRecords, rowToGoal } from "@/features/lite/goals-data";

export type GoalActionResult = { ok: true } | { ok: false; error: string };

/**
 * 목표 만들기 — 시작값은 **서버가** 최근 예상 1RM 으로 정한다(화면 값을 믿지 않는다).
 * 만들기 전에 이미 닿은 목표는 '이룸'으로 닫아서 한도에서 뺀다.
 */
export async function createGoalAction(input: {
  exerciseId: string;
  targetKg: number;
  targetDate: string;
}): Promise<GoalActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요해요." };
  const exerciseId = typeof input?.exerciseId === "string" ? input.exerciseId.trim() : "";
  if (!exerciseId) return { ok: false, error: "종목을 골라 주세요." };
  const supabase = await createSupabaseServerClient();
  const today = seoulYmd();
  const [records, plan, { data: existing }] = await Promise.all([
    loadLiftRecords(user.id),
    resolvePlan(),
    supabase
      .from("lift_goals")
      .select("id, exercise_id, start_kg, target_kg, start_date, target_date, achieved_at")
      .eq("user_id", user.id)
      .is("achieved_at", null),
  ]);

  // 이미 닿은 목표는 닫는다 — 한도(무료 1·라이트 3)는 진행 중인 것만 센다.
  const open = ((existing ?? []) as Record<string, unknown>[]).map(rowToGoal);
  const reached = open.filter((g) => goalProgress(g, oneRMSeries(records, g.exerciseId), today).achieved);
  if (reached.length) {
    await supabase
      .from("lift_goals")
      .update({ achieved_at: new Date().toISOString() })
      .in("id", reached.map((g) => g.id));
  }
  const stillOpen = open.filter((g) => !reached.includes(g));
  if (stillOpen.some((g) => g.exerciseId === exerciseId)) return { ok: false, error: "이 종목은 이미 목표가 있어요." };
  const limit = goalLimit(plan);
  if (stillOpen.length >= limit) {
    return {
      ok: false,
      error: limit === 1 ? "무료는 목표 1개까지예요. 라이트에서 3개까지 정할 수 있어요." : `목표는 ${limit}개까지예요.`,
    };
  }

  const startKg = Math.round(latestOneRm(oneRMSeries(records, exerciseId)) * 10) / 10;
  if (startKg <= 0) return { ok: false, error: "이 종목은 아직 무게 기록이 없어요. 한 번 하고 나서 정해 주세요." };
  const targetKg = Math.round(Number(input.targetKg) * 10) / 10;
  const bad = validateGoalInput({ startKg, targetKg, targetDate: String(input.targetDate ?? "") }, today);
  if (bad) return { ok: false, error: bad };

  const { error } = await supabase.from("lift_goals").insert({
    user_id: user.id,
    exercise_id: exerciseId,
    start_kg: startKg,
    target_kg: targetKg,
    start_date: today,
    target_date: input.targetDate,
  });
  if (error) {
    return { ok: false, error: error.message.includes("lift_goals_cap") ? "목표는 3개까지예요." : "목표를 저장하지 못했어요." };
  }
  revalidatePath("/fit");
  return { ok: true };
}

export async function deleteGoalAction(id: string): Promise<GoalActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요해요." };
  if (typeof id !== "string" || !id) return { ok: false, error: "잘못된 요청이에요." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("lift_goals").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { ok: false, error: "지우지 못했어요." };
  revalidatePath("/fit");
  return { ok: true };
}
