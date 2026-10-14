import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 진행 중이던 기록을 **한 만큼만 완료**로 굳힌다 — 운동을 끝냈거나(오늘 것), 끝내지 않고 날이 바뀌었을 때(지난 것).
 * @param before 이 날짜보다 앞의 기록만. 없으면 오늘 포함 전부.
 * @returns 굳힌 행의 exercise_row_id.
 */
export async function finalizeSetProgress(
  supabase: SupabaseClient,
  userId: string,
  opts: { before?: string; on?: string } = {},
): Promise<string[]> {
  let q = supabase.from("exercise_completions").update({ status: "done" }).eq("user_id", userId).eq("status", "partial");
  if (opts.before) q = q.lt("for_date", opts.before);
  if (opts.on) q = q.eq("for_date", opts.on);
  const { data } = await q.select("exercise_row_id");
  return ((data ?? []) as { exercise_row_id: string }[]).map((r) => r.exercise_row_id);
}
