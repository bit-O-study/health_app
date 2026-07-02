/** 헬스장 늑대 — 순수 로직(운동 누적 → 레벨·크기). 테스트 가능. 처음엔 Lv0. */

/**
 * 총 완료 운동 수 → 레벨(0부터 시작). 초반은 빨리, 갈수록 천천히.
 * Lv0→1: 3회, 1→2: 5회, 2→3: 7회 …
 */
export function gymLevel(totalWorkouts: number): number {
  const xp = Math.max(0, Math.floor(totalWorkouts || 0));
  let level = 0;
  let need = 3;
  let acc = 0;
  while (xp >= acc + need) {
    acc += need;
    level += 1;
    need = 3 + level * 2;
  }
  return level;
}

/** 레벨에 따른 늑대 크기 배율(Lv0=작음 → 점점 큼, 상한). */
export function wolfScale(level: number): number {
  return Math.min(1.7, 0.8 + Math.max(0, level) * 0.06);
}
