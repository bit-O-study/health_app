/**
 * 본운동 표시/가이드 큐 순서 결정 — 의존성 없는 순수 로직(페이지·테스트 공용).
 *
 * 멀티 부위(예: 가슴 + 팔) 일자에서 본운동은 부위별 plan 을 이어 붙여 만든다
 * (부위 그룹 순서). 사용자가 부위 경계를 넘어 드래그하면 reorderPlanAction 이
 * 보이는 행 전체에 전역 position(0..N-1)을 다시 매겨 position 이 전역적으로
 * 고유해진다. 그 경우에만 position 순으로 정렬해 사용자가 지정한 교차 순서를
 * 따른다. 기본(추천 등록) 상태는 부위마다 position 이 0..n 으로 겹치므로
 * (서로 다른 두 부위는 항상 position 0 을 공유) 그룹 순서를 그대로 유지한다.
 */
/**
 * "오늘 운동 추가"로 새로 넣은 행은 이 값 이상의 position 을 받는다(부위별 0..n
 * 정상 범위를 훨씬 넘는 큰 값). 멀티 부위 일자에서도 그룹 중간이 아니라 전체
 * 리스트 맨 아래에 붙도록 하기 위함. (드래그로 재정렬하면 0..N-1 로 다시 매겨져
 * 이 표식이 사라지고 사용자 지정 순서를 따른다.)
 */
export const APPEND_POSITION_BASE = 1000;

export function orderMainPlan<T extends { position: number }>(grouped: T[]): T[] {
  if (grouped.length < 2) return grouped;
  // 추가분(큰 position)은 항상 맨 끝으로 — position 순.
  const head = grouped.filter((p) => p.position < APPEND_POSITION_BASE);
  const tail = grouped
    .filter((p) => p.position >= APPEND_POSITION_BASE)
    .sort((a, b) => a.position - b.position);

  // head: 부위 경계를 넘는 전역 재정렬(전역 position 고유)이면 position 순,
  // 기본(부위마다 0..n 겹침)이면 그룹 순서 유지.
  const positions = head.map((p) => p.position);
  const allDistinct = new Set(positions).size === positions.length;
  const headOrdered = allDistinct
    ? [...head].sort((a, b) => a.position - b.position)
    : head;

  return tail.length > 0 ? [...headOrdered, ...tail] : headOrdered;
}

/**
 * 드래그 정렬에서 손가락이 옮긴 거리(dy)로 **놓일 위치(target index)** 를 계산.
 *
 * 행 높이가 제각각(배지·메모·세트별 표시로 76~140px)이라 고정 높이(예: 80px)로
 * 나눠 추정하면 한 칸 더/덜 가거나(이상한 곳) 짧은 행을 건너도 인식이 안 돼
 * "순서가 안 바뀐" 것처럼 보였다. 그래서 드래그 시작 시 캡처한 각 행의 **중심 y**
 * (centers, 화면 좌표)에 대해, 잡은 행의 현재 중심이 지나친 이웃 행만큼만 이동한다.
 *
 * @param centers 드래그 시작 시점의 각 행 중심 y (원래 레이아웃 기준)
 * @param source  잡은 행의 인덱스
 * @param dy      시작점에서의 수직 이동(px)
 * @returns 0..n-1 의 목표 인덱스 (remove(source) 후 insert(target) 규약과 호환)
 */
export function dropIndex(
  centers: number[],
  source: number,
  dy: number,
): number {
  const n = centers.length;
  if (n < 2 || source < 0 || source >= n) return source;
  const dragged = centers[source] + dy;
  let target = source;
  // 아래로: 잡은 행 중심이 다음 행들의 중심을 지나친 만큼 내려간다
  for (let i = source + 1; i < n; i++) {
    if (dragged > centers[i]) target = i;
    else break;
  }
  // 위로: 이전 행들의 중심을 지나친 만큼 올라간다
  for (let i = source - 1; i >= 0; i--) {
    if (dragged < centers[i]) target = i;
    else break;
  }
  return target;
}
