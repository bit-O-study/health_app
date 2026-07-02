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

/** 그룹 운동 1회당 적립 코인(그룹 전체 누적 기준). */
export const COINS_PER_WORKOUT = 10;

/** 현재 레벨 → 다음 레벨(level→level+1)로 올리는 데 드는 코인. 오를수록 비싸진다. */
export function coinsForLevel(level: number): number {
  return 50 + Math.max(0, Math.floor(level)) * 30;
}

export type DepositResult = {
  level: number;
  coins: number;
  progress: number;
  /** 실제로 넣은 코인(보유 초과분은 잘림). */
  added: number;
};

/**
 * 코인 넣기 — amount 만큼 progress 에 투입(보유 coins 한도). 넣은 코인이 다음 레벨 비용을
 * 채우면 자동 레벨업(넘친 만큼 다음 레벨로 이월). 순수 함수(테스트 가능).
 */
export function applyDeposit(
  level: number,
  coins: number,
  progress: number,
  amount: number,
): DepositResult {
  const avail = Math.max(0, Math.floor(coins || 0));
  let amt = Math.floor(Number(amount) || 0);
  if (amt <= 0 || avail <= 0) {
    return { level, coins: avail, progress: Math.max(0, progress || 0), added: 0 };
  }
  amt = Math.min(amt, avail);
  const c = avail - amt;
  let p = Math.max(0, progress || 0) + amt;
  let l = Math.max(0, Math.floor(level || 0));
  while (p >= coinsForLevel(l)) {
    p -= coinsForLevel(l);
    l += 1;
  }
  return { level: l, coins: c, progress: p, added: amt };
}
