/**
 * 행 통째 교체(지우고 다시 넣기) 시 **옛 행 id → 새 행 id** 대응 찾기 — 순수 모듈.
 *
 * 루틴/오늘 계획 저장은 그 부위 행을 전부 삭제하고 새로 insert 한다(= UUID 가 새로 생김).
 * 그러면 오늘 완료기록(exercise_completions.exercise_row_id)이 사라진 행을 가리켜,
 * 완료 취소가 안 먹고 진행이 풀린 것처럼 보인다. 같은 운동끼리 순서대로 1:1 로 이어준다.
 */

export type RemapRow = { id: string; exerciseId: string };

/** 같은 exerciseId 끼리 순서대로 짝지어 (옛 id → 새 id) 목록을 만든다. id 가 같으면 제외. */
export function remapRowIds(
  oldRows: RemapRow[],
  newRows: RemapRow[],
): { from: string; to: string }[] {
  const queue = new Map<string, string[]>();
  for (const r of newRows) {
    const list = queue.get(r.exerciseId) ?? [];
    list.push(r.id);
    queue.set(r.exerciseId, list);
  }
  const pairs: { from: string; to: string }[] = [];
  for (const o of oldRows) {
    const list = queue.get(o.exerciseId);
    if (!list || list.length === 0) continue; // 새 계획에서 빠진 운동 → 고스트로 남음
    const to = list.shift()!;
    if (to !== o.id) pairs.push({ from: o.id, to });
  }
  return pairs;
}
