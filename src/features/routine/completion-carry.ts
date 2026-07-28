import "server-only";

import type { createSupabaseServerClient } from "@/lib/supabase/server";
import { remapRowIds, type RemapRow } from "@/features/routine/row-remap";

type Supabase = Awaited<ReturnType<typeof createSupabaseServerClient>>;

/**
 * 계획 행을 통째로 교체(삭제 후 재삽입)했을 때, 그 날의 완료기록이 새 행 id 를 가리키게 옮긴다.
 *
 * 이걸 안 하면 운동 중에 "부위 추가"나 루틴/오늘 계획 편집을 저장하는 순간 완료기록이
 * 사라진 행을 가리켜 — 화면상 완료는 (부위:운동) 폴백으로 유지되지만 **완료 취소가 안 먹는다**
 * (행 id 로 지우는데 그 행이 없으니 0건 삭제). 같은 운동끼리 순서대로 1:1 로 이어준다.
 *
 * 기준을 '옛 계획 행'이 아니라 **완료기록 자체**로 잡는다 — 이미 옛 행이 지워져
 * 붕 떠 있는(dangling) 기록까지 새 행으로 끌어올 수 있다.
 */
export async function carryOverCompletions(
  supabase: Supabase,
  userId: string,
  forDate: string,
  focus: string,
  newRows: RemapRow[],
): Promise<void> {
  const { data } = await supabase
    .from("exercise_completions")
    .select("id, exercise_row_id, exercise_id")
    .eq("user_id", userId)
    .eq("for_date", forDate)
    .eq("focus", focus);

  const records = ((data ?? []) as {
    exercise_row_id: string;
    exercise_id: string | null;
  }[])
    .filter((c) => !!c.exercise_id)
    .map((c) => ({ id: c.exercise_row_id, exerciseId: c.exercise_id as string }));
  if (records.length === 0) return;

  for (const { from, to } of remapRowIds(records, newRows)) {
    await supabase
      .from("exercise_completions")
      .update({ exercise_row_id: to })
      .eq("user_id", userId)
      .eq("for_date", forDate)
      .eq("exercise_row_id", from);
  }
}
