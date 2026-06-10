/**
 * 오늘 완료 상태 매칭 — 순수 모듈(server-only 없음 → 단위 테스트 가능).
 *
 * 완료는 '사실'이라, 루틴을 바꿔(다가오는 7일 드래그·운동 재선택 등) 운동 행의
 * UUID 가 새로 생겨도 오늘 화면에서 완료로 유지돼야 한다. 그래서 완료를 행 id
 * 뿐 아니라 (부위:운동) 복합 키로도 인식한다.
 */

export type CompletionStatus = "done" | "skipped";

/** 오늘 운동별 완료 키. 행 UUID 가 바뀌어도 같은 (부위, 운동) 이면 매칭되도록
 * `f:${focus}:${exerciseId}` 복합 키를 만든다. */
export function exerciseCompletionKey(
  focus: string | null | undefined,
  exerciseId: string | null | undefined,
): string {
  return `f:${focus ?? ""}:${exerciseId ?? ""}`;
}

/**
 * 완료 상태 맵에서 한 운동 행의 상태를 찾는다.
 * 1) 행 id 정확 매칭 → 2) (부위:운동) 복합 키 폴백.
 * 루틴 변경으로 행 UUID 가 새로 생겨도 오늘 같은 (부위, 운동) 이면 완료 유지.
 */
export function resolveTodayStatus(
  statusMap: Map<string, CompletionStatus>,
  row: {
    id: string;
    focus: string | null | undefined;
    exerciseId: string | null | undefined;
  },
): CompletionStatus | undefined {
  return (
    statusMap.get(row.id) ??
    statusMap.get(exerciseCompletionKey(row.focus, row.exerciseId))
  );
}