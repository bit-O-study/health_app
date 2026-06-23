import "server-only";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import type { CompletionStatus } from "@/features/routine/exercise-completions";

function toStatus(s: string): CompletionStatus {
  return s === "skipped" ? "skipped" : "done";
}

/** 워밍업/마무리 완료의 (종류:항목) 키. 본운동과 같은 이유로, 루틴을 바꿔 행 UUID 가
 * 새로 생겨도 오늘 같은 항목이 보이면 완료로 유지되게 한다. */
export function conditioningCompletionKey(
  kind: string | null | undefined,
  itemId: string | null | undefined,
): string {
  return `c:${kind ?? ""}:${itemId ?? ""}`;
}

/** 오늘의 워밍업/마무리 상태 맵. source_row_id + (종류:항목) 키 포함.
 * (예전엔 "종류 단위" 키로 오늘 워밍업 한번 하면 루틴을 바꿔도 새 워밍업까지 완료로
 *  표시했는데, 그러면 새 루틴의 워밍업이 완료로 떠 버리고 표시행 id 로는 취소도 안 돼
 *  본운동과 동작이 달랐다. 이제 본운동과 동일하게 행 id + (종류:항목) 으로만 매칭한다.) */
export async function getConditioningStatusMapToday(
  todayYmd: string,
): Promise<Map<string, CompletionStatus>> {
  const user = await getCurrentUser();
  if (!user) return new Map();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("conditioning_completions")
    .select("source_row_id, status, kind, item_id")
    .eq("user_id", user.id)
    .eq("for_date", todayYmd);

  if (error || !data) return new Map();
  const map = new Map<string, CompletionStatus>();
  for (const r of data as {
    source_row_id: string | null;
    status: string;
    kind: string | null;
    item_id: string | null;
  }[]) {
    const st = toStatus(r.status);
    if (r.source_row_id) map.set(r.source_row_id, st);
    // 같은 항목을 오늘 done 했으면 done 우선(skip 으로 덮지 않음).
    const key = conditioningCompletionKey(r.kind, r.item_id);
    if (st === "done" || !map.has(key)) map.set(key, st);
  }
  return map;
}
