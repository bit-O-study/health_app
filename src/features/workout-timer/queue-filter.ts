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

/**
 * 운동모드(가이드) 좌/우 네비게이션에서 이동할 다음 인덱스를 찾는다.
 *
 * 가이드 큐는 시작 시점 스냅샷이라(인덱스 밀림 방지) 세션 중 완료/스킵한 항목도
 * 배열에는 그대로 남는다. 완료한 운동은 운동모드에 다시 안 떠야 하므로, 화살표(‹ ›)·
 * 스와이프 이동 시 이번 세션에 처리한(processed) 항목은 건너뛴다.
 * (예전엔 ‹ 로 되돌아가면 방금 완료한 운동이 다시 보였다 — 그 버그 방지.)
 *
 * @param rowIds    큐 항목들의 rowId (스냅샷 순서)
 * @param processed 이번 세션에 완료/스킵한 rowId 집합
 * @param current   현재 인덱스
 * @param dir       +1 = 다음, -1 = 이전
 * @returns 이동할 인덱스. 갈 곳이 없으면 null.
 */
/**
 * 운동 타이머를 자동 종료(기록)할지 — "오늘 운동을 전부 끝냈을 때"만 true.
 *
 * queueItems(전체, 완료/스킵 포함)까지 0이 되는 건 완료가 아니라 오늘 운동 자체가
 * 없어진 것(오늘만 바꾸기·전체 교체 등으로 daily_plan 이 지워진 순간의 일시적 스냅샷).
 * 그때 큐 길이만 보고 종료시키면, 운동 중 부위추가/전체바꾸기만 눌러도 진행 중이던
 * 시간이 저장되며 화면 타이머가 즉시 0으로 리셋돼버린다 — 그 버그 재발 방지용 가드.
 */
export function shouldAutoEndSession(
  hadItems: boolean,
  queueLength: number,
  queueItemsLength: number,
): boolean {
  return hadItems && queueLength === 0 && queueItemsLength > 0;
}

export function adjacentActiveIndex(
  rowIds: readonly string[],
  processed: ReadonlySet<string>,
  current: number,
  dir: 1 | -1,
): number | null {
  for (let i = current + dir; i >= 0 && i < rowIds.length; i += dir) {
    if (!processed.has(rowIds[i])) return i;
  }
  return null;
}
