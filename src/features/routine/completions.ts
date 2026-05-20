import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CompletionRow = {
  forDate: string;
  focus: string;
  calories: number | null;
};

type Row = {
  for_date: string;
  focus: string;
  calories: number | null;
};

/** 오늘 완료 여부 */
export async function isCompletedToday(ymd: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { count } = await supabase
    .from("workout_completions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("for_date", ymd);

  return (count ?? 0) > 0;
}

/** 최근 N일치 완료 기록(최신→과거 순) */
export async function getRecentCompletions(
  days = 90,
): Promise<CompletionRow[]> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const from = new Date();
  from.setUTCDate(from.getUTCDate() - days);
  const fromStr = from.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("workout_completions")
    .select("for_date, focus, calories")
    .eq("user_id", user.id)
    .gte("for_date", fromStr)
    .order("for_date", { ascending: false });

  if (error || !data) return [];

  return (data as Row[]).map((r) => ({
    forDate: r.for_date,
    focus: r.focus,
    calories: r.calories,
  }));
}
