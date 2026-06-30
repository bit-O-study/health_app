import "server-only";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { seoulYmd } from "@/features/routine/data";

/** 오늘 저장된 걸음수(없으면 null). */
export async function getTodaySteps(): Promise<number | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("daily_steps")
    .select("steps")
    .eq("user_id", user.id)
    .eq("for_date", seoulYmd())
    .maybeSingle();
  if (!data) return null;
  const n = Number((data as { steps: number }).steps);
  return Number.isFinite(n) ? n : null;
}
