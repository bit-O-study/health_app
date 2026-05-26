import "server-only";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import type { CompletionStatus } from "@/features/routine/exercise-completions";

function toStatus(s: string): CompletionStatus {
  return s === "skipped" ? "skipped" : "done";
}

/** 오늘의 워밍업/마무리 행별 상태 맵 (source_row_id → done/skipped) */
export async function getConditioningStatusMapToday(
  todayYmd: string,
): Promise<Map<string, CompletionStatus>> {
  const user = await getCurrentUser();
  if (!user) return new Map();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("conditioning_completions")
    .select("source_row_id, status")
    .eq("user_id", user.id)
    .eq("for_date", todayYmd);

  if (error || !data) return new Map();
  const map = new Map<string, CompletionStatus>();
  for (const r of data as { source_row_id: string | null; status: string }[]) {
    if (!r.source_row_id) continue;
    map.set(r.source_row_id, toStatus(r.status));
  }
  return map;
}
