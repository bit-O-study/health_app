/**
 * 연속 운동일 규칙 — 캘린더 · 그룹 · 홈 위젯이 이 함수 하나만 쓴다(2026-10-07 정리).
 *
 * 오늘은 아직 안 했을 수 있다: 오늘(0일 전)이 비어 있으면 어제부터 센다. 그 뒤로 하루라도
 * 비면 거기서 멈춘다. 예전엔 같은 규칙이 세 곳에 따로 있었다.
 *
 * @param isActive 며칠 전(0 = 오늘)에 운동했는가.
 */
export function countStreak(isActive: (daysAgo: number) => boolean, maxDays = 366): number {
  let n = 0;
  for (let k = isActive(0) ? 0 : 1; n < maxDays && isActive(k); k += 1) n += 1;
  return n;
}
