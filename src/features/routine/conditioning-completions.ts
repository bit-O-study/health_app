import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CompletionStatus } from "@/features/routine/exercise-completions";
import type { ConditioningKind } from "@/features/routine/conditioning-catalog";

export type ConditioningStatusKey = `${ConditioningKind}:${string}`;

function toStatus(s: string): CompletionStatus {
  return s === "skipped" ? "skipped" : "done";
}

/** 오늘의 워밍업/마무리 항목 상태 맵 (kind:itemId → done/skipped) */
export async function getConditioningStatusMapToday(
  todayYmd: string,
): Promise<Map<ConditioningStatusKey, CompletionStatus>> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Map();

  const { data, error } = await supabase
    .from("conditioning_completions")
    .select("kind, item_id, status")
    .eq("user_id", user.id)
    .eq("for_date", todayYmd);

  if (error || !data) return new Map();
  const map = new Map<ConditioningStatusKey, CompletionStatus>();
  for (const r of data as { kind: string; item_id: string; status: string }[]) {
    const k = (r.kind === "cooldown" ? "cooldown" : "warmup") as ConditioningKind;
    map.set(`${k}:${r.item_id}`, toStatus(r.status));
  }
  return map;
}
