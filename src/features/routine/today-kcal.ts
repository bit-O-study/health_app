/**
 * 오늘 운동 소모 칼로리 요약 — 운동 탭 진행 카드의 작은 한 줄(2026-10-07 다시 넣음).
 * 끝낸 것만 '소모', 건너뛴 것은 빼고 '오늘 예상'. kcal 은 항목마다 같은 규칙(burn.ts·calories.ts)으로 낸 값.
 */
export function todayKcal(items: readonly { kcal: number; done: boolean; skipped: boolean }[]): {
  done: number;
  total: number;
} {
  let done = 0;
  let total = 0;
  for (const it of items) {
    if (it.skipped) continue;
    total += it.kcal;
    if (it.done) done += it.kcal;
  }
  return { done: Math.round(done), total: Math.round(total) };
}
