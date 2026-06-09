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

/** 워밍업/마무리 "종류" 단위 완료 키. 오늘 그 종류(워밍업/마무리)를 한 번이라도
 * 완료했으면, 루틴을 바꿔 부위가 달라져 마무리 종목 자체가 바뀌어도(런닝→스트레칭)
 * 그 섹션을 완료로 유지한다. (사용자 결정: "오늘 마무리 한번 하면 종일 완료") */
export function conditioningKindDoneKey(kind: string | null | undefined): string {
  return `k:${kind ?? ""}`;
}

/** 오늘의 워밍업/마무리 상태 맵. source_row_id + (종류:항목) + (종류) 키 모두 포함. */
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
    const key = conditioningCompletionKey(r.kind, r.item_id);
    if (st === "done" || !map.has(key)) map.set(key, st);
    // 종류 단위는 "완료"만 표식(스킵은 종일 완료로 번지지 않게).
    if (st === "done") map.set(conditioningKindDoneKey(r.kind), "done");
  }
  return map;
}
