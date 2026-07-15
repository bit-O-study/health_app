/**
 * 오늘만(daily) 오버라이드 판정 순수 로직 — server-only 없음(단위 테스트 가능).
 *
 * 배경: 런닝을 마치면 러닝 기록이 마무리운동(cooldown)의 daily_conditioning 오버라이드로
 * 저장된다(기본 마무리 + 러닝 append). 그러면 마무리운동 헤더에 "오늘만" 배지가 떠서,
 * 사용자가 마무리운동을 '바꾼' 것처럼 오해된다(실제로는 런닝을 기록만 한 것).
 * → 오버라이드가 "기본값 + 러닝 자동기록"뿐이면 수동 변경으로 보지 않는다.
 */

type ItemLike = { itemId: string };

/**
 * daily 오버라이드가 '러닝 자동기록만 얹힌' 상태인지 —
 * 러닝 행을 빼면 기본값(defaults)과 순서·항목이 같으면 true(=수동변경 아님).
 * 러닝 행이 아예 없으면 false(러닝과 무관한 오버라이드).
 */
export function isRunOnlyCooldownOverride(
  daily: ItemLike[],
  defaults: ItemLike[],
): boolean {
  const hasRun = daily.some((r) => r.itemId === "running");
  if (!hasRun) return false;
  const nonRun = daily.filter((r) => r.itemId !== "running");
  if (nonRun.length !== defaults.length) return false;
  return nonRun.every((r, i) => r.itemId === defaults[i]?.itemId);
}

/**
 * 마무리운동 헤더에 "오늘만" 배지를 보여줄지 — daily 오버라이드가 있고,
 * 그게 '러닝 자동기록만'이 아닐 때만 true(진짜 수동 변경).
 */
export function showsDailyCooldownBadge(
  daily: ItemLike[],
  defaults: ItemLike[],
): boolean {
  if (daily.length === 0) return false;
  return !isRunOnlyCooldownOverride(daily, defaults);
}