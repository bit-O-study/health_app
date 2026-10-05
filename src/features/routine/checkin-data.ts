import "server-only";

import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { seoulYmd } from "@/features/routine/data";
import { cleanPainAreas, isCheckin, type Checkin } from "@/features/routine/checkin";
import type { BodyPart } from "@/features/routine/exercise-catalog-labels";

/** 오늘 컨디션 체크인. 없거나 못 읽으면 null. */
export async function getTodayCheckin(): Promise<Checkin | null> {
  try {
    const user = await getCurrentUser();
    if (!user) return null;
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("daily_checkins")
      .select("sleep, soreness, energy")
      .eq("user_id", user.id)
      .eq("for_date", seoulYmd())
      .maybeSingle();
    return isCheckin(data) ? (data as Checkin) : null;
  } catch {
    return null;
  }
}

/** 아픈 부위(설정). 못 읽으면 빈 배열 — 모르는 걸로 운동을 빼지 않는다. */
export async function getPainAreas(): Promise<BodyPart[]> {
  try {
    const user = await getCurrentUser();
    if (!user) return [];
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.from("profiles").select("pain_areas").eq("user_id", user.id).maybeSingle();
    return cleanPainAreas((data as { pain_areas?: unknown } | null)?.pain_areas);
  } catch {
    return [];
  }
}
