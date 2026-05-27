import "server-only";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";

/** 한 날짜의 누적 운동 시간(초). 없으면 0. */
export async function getWorkoutDurationFor(dateYmd: string): Promise<number> {
  const user = await getCurrentUser();
  if (!user) return 0;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("workout_sessions")
    .select("duration_sec")
    .eq("user_id", user.id)
    .eq("for_date", dateYmd)
    .maybeSingle();
  return Math.max(0, Number(data?.duration_sec ?? 0));
}

/**
 * 기간 내 일자별 누적 운동 시간 맵. YYYY-MM-DD → seconds.
 * 캘린더(history) 에서 한 번에 조회.
 */
export async function getWorkoutDurationsRange(
  fromYmd: string,
  toYmd: string,
): Promise<Map<string, number>> {
  const user = await getCurrentUser();
  if (!user) return new Map();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("workout_sessions")
    .select("for_date, duration_sec")
    .eq("user_id", user.id)
    .gte("for_date", fromYmd)
    .lte("for_date", toYmd);
  const map = new Map<string, number>();
  for (const row of (data ?? []) as { for_date: string; duration_sec: number }[]) {
    map.set(row.for_date, Math.max(0, Number(row.duration_sec ?? 0)));
  }
  return map;
}
