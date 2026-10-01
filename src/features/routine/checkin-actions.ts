"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { seoulYmd } from "@/features/routine/data";
import { pinRoutineFocusesForTodayAction } from "@/features/routine/daily-plan-actions";
import { parseSetDetails } from "@/features/routine/set-details";
import {
  adviceFor,
  cleanPainAreas,
  isCheckin,
  lightenRow,
  type Advice,
  type Checkin,
} from "@/features/routine/checkin";

/** 오늘 컨디션 저장(하루 한 행, 다시 고르면 덮어쓴다) → 권하는 강도. */
export async function saveCheckinAction(
  input: Checkin,
): Promise<{ ok: true; advice: Advice } | { ok: false; error: string }> {
  if (!isCheckin(input)) return { ok: false, error: "세 가지를 모두 골라 주세요." };
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요해요." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("daily_checkins").upsert(
    {
      user_id: user.id,
      for_date: seoulYmd(),
      sleep: input.sleep,
      soreness: input.soreness,
      energy: input.energy,
      created_at: new Date().toISOString(),
    },
    { onConflict: "user_id,for_date" },
  );
  if (error) return { ok: false, error: "저장하지 못했어요. 잠시 뒤 다시 시도해 주세요." };
  revalidatePath("/routine");
  return { ok: true, advice: adviceFor(input) };
}

/**
 * [오늘만 세트 줄이기] — 컨디션이 안 좋을 때. 오늘 운동마다 세트를 하나씩(최소 1) 줄인다.
 *
 * 🔴 오늘 계획(daily_plan)에서만 — 영구 루틴은 그대로(원칙 2). 오늘 루틴을 먼저 오늘 계획으로
 *    고정(pin)한 뒤 그 줄들을 고친다(오늘만 운동 변경과 같은 방식). 내일은 원래 루틴 그대로.
 */
export async function lightenTodayAction(): Promise<{ ok: true; changed: number } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요해요." };
  const pin = await pinRoutineFocusesForTodayAction();
  if (!pin.ok) return pin;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("daily_plan")
    .select("id, sets, set_details")
    .eq("user_id", user.id)
    .eq("for_date", seoulYmd());
  if (error) return { ok: false, error: "오늘 운동을 읽지 못했어요." };
  let changed = 0;
  for (const r of (data ?? []) as { id: string; sets: number | null; set_details: unknown }[]) {
    const before = { sets: Number(r.sets) || 1, setDetails: parseSetDetails(r.set_details) };
    const after = lightenRow(before);
    if (after.sets === before.sets) continue;
    const up = await supabase
      .from("daily_plan")
      .update({ sets: after.sets, set_details: after.setDetails })
      .eq("id", r.id)
      .eq("user_id", user.id);
    if (!up.error) changed += 1;
  }
  revalidatePath("/routine");
  return { ok: true, changed };
}

/** 아픈 부위 저장(설정). AI 트레이너 후보에서 그 부위를 빼고, 오늘 운동 화면에서 알린다. */
export async function savePainAreasAction(parts: unknown): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요해요." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({ pain_areas: cleanPainAreas(parts) })
    .eq("user_id", user.id);
  if (error) return { ok: false, error: "저장하지 못했어요. 잠시 뒤 다시 시도해 주세요." };
  revalidatePath("/routine");
  revalidatePath("/settings/pain");
  revalidatePath("/ai-trainer");
  return { ok: true };
}
