/**
 * 운동모드 '완료한 세트 수' 저장 키 결정 — 순수 모듈(테스트 가능, localStorage 의존 없음).
 *
 * 세트 진행은 행 id(rowId)로 저장하는데, **오늘만 부위 추가 / 루틴·운동 편집 저장**을 하면
 * 서버가 그 부위의 행을 지우고 다시 넣어(= 행 UUID 가 새로 생김) rowId 가 바뀐다.
 * 그러면 "3세트 완료" 진행이 통째로 0으로 리셋돼 보였다.
 * → 완료 판정(completion-match)과 똑같이 **(부위:운동) 키**로도 함께 저장해서,
 *   행 id 가 바뀌어도 같은 (부위, 운동)이면 진행이 이어진다.
 *
 * ⚠ 한 부위에 같은 운동이 두 행 있으면 키 폴백은 둘이 같은 값을 본다(행 id 가 살아있는
 *   동안엔 각자 값이 우선이라 평소엔 문제 없음). 완료 기록의 키 폴백과 같은 한계.
 */

/** 행 id 저장분 우선, 없으면 (부위:운동) 키 저장분, 그것도 없으면 0. */
export function pickSetsDone(
  byRow: Record<string, number> | undefined,
  byKey: Record<string, number> | undefined,
  rowId: string,
  key?: string | null,
): number {
  const direct = byRow?.[rowId];
  if (typeof direct === "number" && direct >= 0) return Math.floor(direct);
  if (key) {
    const fallback = byKey?.[key];
    if (typeof fallback === "number" && fallback >= 0) {
      return Math.floor(fallback);
    }
  }
  return 0;
}

/**
 * 편집 화면(오늘 할 운동 연필·오늘만 운동 변경)에서 고를 수 있는 총 세트 수의 하한.
 * 운동모드와 같은 규칙 — 이미 완료한 세트 아래로는 못 줄인다(세트 완료를 취소해야 줄일 수 있음).
 * 운동 자체를 '완료' 처리했으면(목록에서 밀어서 완료 포함) 지금 세트 수 아래로 못 줄인다
 * — 완료를 취소하기 전까지. 항상 최소 1.
 */
export function minEditableSets(
  setsDone: number,
  exerciseDone: boolean,
  currentSets: number,
): number {
  const done = Math.floor(Number.isFinite(setsDone) ? setsDone : 0);
  const current = Math.floor(Number.isFinite(currentSets) ? currentSets : 0);
  return Math.max(1, exerciseDone ? Math.max(current, done) : done);
}

/** 하한 아래로 줄이려 할 때 보여 줄 안내 문구. */
export function setsBelowDoneMessage(minSets: number, exerciseDone: boolean): string {
  return exerciseDone
    ? `완료한 운동이라 ${minSets}세트 아래로 줄일 수 없어요. 완료를 취소한 뒤 줄여 주세요.`
    : `이미 ${minSets}세트를 완료했어요. 세트 완료를 취소해야 줄일 수 있어요.`;
}
