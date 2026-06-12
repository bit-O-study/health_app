/**
 * '운동 시작' 가이드 큐에서 한 항목이 아직 '할 것'(active)인지 판정.
 *
 * 큐(queueItems)에는 완료/스킵 포함 '모든' 항목이 들어온다. 제외는 여기서:
 * 로컬 오버라이드(리스트에서 방금 스킵/완료/취소)가 있으면 그걸 우선하고, 없으면
 * 서버 상태(doneOrSkipped)를 따른다. 이래야 휴식(스킵) 취소 후 바로 시작해도 그
 * 운동이 큐에 뜨고(override='active'), 방금 스킵한 건 즉시 빠진다.
 */
export type LocalCompletion = "active" | "done" | "skipped";

export function isQueueItemActive(
  rowId: string,
  serverInactive: Set<string>,
  completion: Record<string, LocalCompletion> | null | undefined,
): boolean {
  const ov = completion?.[rowId];
  if (ov) return ov === "active";
  return !serverInactive.has(rowId);
}
