import "server-only";

import type { createSupabaseServerClient } from "@/lib/supabase/server";
import { remapRowIds, type RemapRow } from "@/features/routine/row-remap";

type Supabase = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/**
 * 계획 행을 통째로 교체(삭제 후 재삽입)했을 때, 그 날의 완료기록이 새 행 id 를 가리키게 옮긴다.
 *
 * 이걸 안 하면 운동 중에 "부위 추가"나 루틴/오늘 계획 편집을 저장하는 순간 완료기록이
 * 사라진 행을 가리켜 — 화면상 완료가 풀린 것처럼 보이고 완료 취소도 안 먹는다.
 * (계획에서 빠진 운동의 기록은 옮기지 않는다 → 고스트로 남아 완료 표시는 유지.)
 */
export async function carryOverCompletions(
  supabase: Supabase,
  userId: string,
  forDate: string,
  oldRows: RemapRow[],
  newRows: RemapRow[],
): Promise<void> {
  const pairs = remapRowIds(oldRows, newRows);
  for (const { from, to } of pairs) {
    await supabase
      .from("exercise_completions")
      .update({ exercise_row_id: to })
      .eq("user_id", userId)
      .eq("for_date", forDate)
      .eq("exercise_row_id", from);
  }
}
