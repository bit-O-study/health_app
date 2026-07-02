/** 늑대 펫 레벨/포인트 — 순수 로직(운동 수 → Lv·경험치). 테스트 가능. */

/** 운동 1회당 지급 포인트(옷 구매용 재화). */
export const POINTS_PER_WORKOUT = 10;

export type PetLevel = {
  level: number;
  /** 누적 경험치(=총 완료 운동 수). */
  xp: number;
  /** 현재 레벨 안에서의 경험치. */
  intoLevel: number;
  /** 다음 레벨까지 필요한 경험치. */
  need: number;
  /** 현재 레벨 진행률(%). */
  pct: number;
};

/**
 * 총 운동 수 → 레벨. 초반은 빨리, 갈수록 천천히(레벨당 필요치 +2씩 증가).
 * Lv1→2: 3회, 2→3: 5회, 3→4: 7회 …
 */
export function petLevel(totalWorkouts: number): PetLevel {
  const xp = Math.max(0, Math.floor(totalWorkouts || 0));
  let level = 1;
  let need = 3;
  let acc = 0;
  while (xp >= acc + need) {
    acc += need;
    level += 1;
    need = 3 + (level - 1) * 2;
  }
  const intoLevel = xp - acc;
  const pct = need > 0 ? Math.min(100, Math.round((intoLevel / need) * 100)) : 0;
  return { level, xp, intoLevel, need, pct };
}

export type PetStage = { title: string; scale: number };

/** 레벨대별 성장 단계(이름·크기 배율). 갈수록 늠름/커짐. */
export function petStage(level: number): PetStage {
  if (level >= 20) return { title: "알파 늑대", scale: 1.3 };
  if (level >= 12) return { title: "눈서리 늑대", scale: 1.18 };
  if (level >= 6) return { title: "늠름한 늑대", scale: 1.08 };
  if (level >= 3) return { title: "늑대", scale: 1.0 };
  return { title: "아기 늑대", scale: 0.88 };
}

/** 누적 운동 수로 총 획득 포인트. */
export function earnedPoints(totalWorkouts: number): number {
  return Math.max(0, Math.floor(totalWorkouts || 0)) * POINTS_PER_WORKOUT;
}
