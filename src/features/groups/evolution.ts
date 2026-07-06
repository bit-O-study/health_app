/**
 * 그룹 펫 진화 — 순수 로직(레벨 → 진화 단계·크기). 테스트 가능.
 *
 * 아이템(꾸미기) 대신, 레벨이 오르면 알 → 아기 → 청소년 → 어른 → 할아버지 강아지로
 * 형태가 바뀐다. 한 단계 안에서는 크기가 최대치까지 커지고, 그 이상은 커지지 않고
 * (상한 고정) 다음 레벨 구간에서 새로운 형태로 "진화"한다.
 */

export type PetStageId = "egg" | "baby" | "teen" | "adult" | "elder";

export type PetStage = {
  id: PetStageId;
  /** 화면 표시 이름 */
  title: string;
  /** 짧은 이모지(뱃지용) */
  emoji: string;
  /** 이 단계 최소 레벨(포함) */
  minLevel: number;
  /** 이 단계 최대 레벨(포함). null = 무제한(마지막 단계). */
  maxLevel: number | null;
  /** 단계 시작 크기 배율 */
  minScale: number;
  /** 단계에서 더 커지지 않는 상한 배율 */
  maxScale: number;
};

/**
 * 진화 단계표. 레벨 구간:
 *  알 1~9(=0~9) → 아기 10~29 → 청소년 30~69 → 어른 70~199 → 할아버지 200~무제한.
 */
export const PET_STAGES: PetStage[] = [
  { id: "egg", title: "알", emoji: "🥚", minLevel: 0, maxLevel: 9, minScale: 0.7, maxScale: 0.95 },
  { id: "baby", title: "아기 강아지", emoji: "🐶", minLevel: 10, maxLevel: 29, minScale: 0.85, maxScale: 1.1 },
  { id: "teen", title: "청소년 강아지", emoji: "🐕", minLevel: 30, maxLevel: 69, minScale: 1.05, maxScale: 1.3 },
  { id: "adult", title: "어른 강아지", emoji: "🦮", minLevel: 70, maxLevel: 199, minScale: 1.25, maxScale: 1.55 },
  { id: "elder", title: "할아버지 강아지", emoji: "🐕‍🦺", minLevel: 200, maxLevel: null, minScale: 1.5, maxScale: 1.7 },
];

/** 레벨 → 현재 진화 단계. */
export function petStage(level: number): PetStage {
  const lv = Math.max(0, Math.floor(Number(level) || 0));
  for (let i = PET_STAGES.length - 1; i >= 0; i--) {
    if (lv >= PET_STAGES[i].minLevel) return PET_STAGES[i];
  }
  return PET_STAGES[0];
}

/** 다음 진화 단계(마지막이면 null). */
export function nextStage(level: number): PetStage | null {
  const cur = petStage(level);
  const idx = PET_STAGES.findIndex((s) => s.id === cur.id);
  return PET_STAGES[idx + 1] ?? null;
}

/** 현재 단계 안에서의 진행도(0~1). 마지막(무제한) 단계는 +50레벨에 걸쳐 1로 수렴. */
export function stageProgress(level: number): number {
  const lv = Math.max(0, Math.floor(Number(level) || 0));
  const s = petStage(lv);
  if (s.maxLevel === null) {
    return Math.min(1, Math.max(0, (lv - s.minLevel) / 50));
  }
  const span = s.maxLevel - s.minLevel;
  if (span <= 0) return 1;
  return Math.min(1, Math.max(0, (lv - s.minLevel) / span));
}

/**
 * 레벨 → 크기 배율. 단계 안에서 minScale→maxScale 로 커지고, 상한(maxScale)을 넘으면
 * 더 이상 커지지 않는다(다음 단계에서 새 형태로 진화). 항상 [minScale, maxScale] 안.
 */
export function petScale(level: number): number {
  const s = petStage(level);
  const t = stageProgress(level);
  return s.minScale + (s.maxScale - s.minScale) * t;
}

/** 다음 진화까지 남은 레벨(마지막 단계면 null). */
export function levelsToEvolve(level: number): number | null {
  const s = petStage(level);
  if (s.maxLevel === null) return null;
  const lv = Math.max(0, Math.floor(Number(level) || 0));
  return Math.max(0, s.maxLevel + 1 - lv);
}