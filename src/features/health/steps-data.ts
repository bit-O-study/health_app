import "server-only";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { seoulYmd } from "@/features/routine/data";

/** 오늘 저장된 걸음수(없으면 null). */
export async function getTodaySteps(): Promise<number | null> {
  return getStepsForDate(seoulYmd());
}

/** 특정 날짜의 걸음수(없으면 null). */
export async function getStepsForDate(dateYmd: string): Promise<number | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("daily_steps")
    .select("steps")
    .eq("user_id", user.id)
    .eq("for_date", dateYmd)
    .maybeSingle();
  if (!data) return null;
  const n = Number((data as { steps: number }).steps);
  return Number.isFinite(n) ? n : null;
}

/** from~to 범위의 일자별 걸음수 Map(YYYY-MM-DD → steps). */
export async function getStepsRange(
  from: string,
  to: string,
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const user = await getCurrentUser();
  if (!user) return out;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("daily_steps")
    .select("for_date, steps")
    .eq("user_id", user.id)
    .gte("for_date", from)
    .lte("for_date", to);
  for (const r of (data ?? []) as { for_date: string; steps: number | string }[]) {
    const n = Number(r.steps);
    if (Number.isFinite(n)) out.set(r.for_date, n);
  }
  return out;
}
