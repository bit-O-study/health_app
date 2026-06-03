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
export function orderMainPlan<T extends { position: number }>(grouped: T[]): T[] {
  if (grouped.length < 2) return grouped;
  const positions = grouped.map((p) => p.position);
  const allDistinct = new Set(positions).size === positions.length;
  if (!allDistinct) return grouped;
  return [...grouped].sort((a, b) => a.position - b.position);
}
