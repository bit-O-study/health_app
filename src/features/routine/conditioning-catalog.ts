/**
 * 워밍업/마무리(컨디셔닝) 종목 카탈로그.
 * 런닝·천국의 계단 같은 유산소부터 스트레칭까지 한 곳에서 관리한다.
 */

import type { FocusTone } from "@/features/routine/data";
import type { FocusKey } from "@/features/routine/exercise-catalog";

export type ConditioningKind = "warmup" | "cooldown";

export type ConditioningParam = "duration" | "speed" | "incline";

export const PARAM_LABEL: Record<ConditioningParam, string> = {
  duration: "시간",
  speed: "속도",
  incline: "경사",
};

export const PARAM_UNIT: Record<ConditioningParam, string> = {
  duration: "분",
  speed: "km/h", // 런닝 km/h, 머신류는 강도로 사용
  incline: "%",
};

export type ConditioningItem = {
  id: string;
  name: string;
  /** warmup/cooldown 어느 쪽으로 쓸 수 있는지 */
  kinds: ConditioningKind[];
  /** 입력받을 파라미터(없으면 동작 이름만) */
  params?: ConditioningParam[];
  /** 추천 시 기본 시간(분) */
  defaultMin?: number;
  /** 추천 시 기본 속도(km/h 또는 강도) */
  defaultSpeed?: number;
  /** 추천 시 기본 경사(% 또는 단계) */
  defaultIncline?: number;
};

const ITEMS: Record<string, ConditioningItem> = {
  // ── 유산소 / 컨디셔닝 (속도·경사 입력 지원)
  running: {
    id: "running",
    name: "런닝",
    kinds: ["warmup", "cooldown"],
    params: ["duration", "speed", "incline"],
    defaultMin: 5,
    defaultSpeed: 8,
    defaultIncline: 1,
  },
  "stair-master": {
    id: "stair-master",
    name: "천국의 계단",
    kinds: ["warmup", "cooldown"],
    params: ["duration", "speed", "incline"],
    defaultMin: 10,
    defaultSpeed: 50,
    defaultIncline: 10,
  },
  cycling: {
    id: "cycling",
    name: "사이클",
    kinds: ["warmup", "cooldown"],
    params: ["duration", "speed", "incline"],
    defaultMin: 5,
    defaultSpeed: 20,
  },
  rowing: {
    id: "rowing",
    name: "로잉 머신",
    kinds: ["warmup"],
    params: ["duration", "speed"],
    defaultMin: 5,
  },
  elliptical: {
    id: "elliptical",
    name: "일립티컬",
    kinds: ["warmup", "cooldown"],
    params: ["duration", "speed", "incline"],
    defaultMin: 5,
  },
  "jump-rope": {
    id: "jump-rope",
    name: "줄넘기",
    kinds: ["warmup"],
    params: ["duration"],
    defaultMin: 3,
  },
  walking: {
    id: "walking",
    name: "걷기",
    kinds: ["warmup", "cooldown"],
    params: ["duration", "speed", "incline"],
    defaultMin: 5,
    defaultSpeed: 5,
  },

  // ── 모빌리티 / 워밍업 동작
  "shoulder-circle": { id: "shoulder-circle", name: "어깨 회전", kinds: ["warmup"] },
  "cat-cow": { id: "cat-cow", name: "캣카우", kinds: ["warmup", "cooldown"] },
  "dead-hang": { id: "dead-hang", name: "데드행", kinds: ["warmup"] },
  "band-pull-apart": { id: "band-pull-apart", name: "밴드 풀어파트", kinds: ["warmup"] },
  "wall-slide": { id: "wall-slide", name: "월 슬라이드", kinds: ["warmup"] },
  "dynamic-lunge": { id: "dynamic-lunge", name: "다이나믹 런지", kinds: ["warmup"] },
  "bw-squat": { id: "bw-squat", name: "보디웨이트 스쿼트", kinds: ["warmup"] },
  "hip-circle": { id: "hip-circle", name: "힙 서클", kinds: ["warmup"] },
  "dead-bug": { id: "dead-bug", name: "데드버그", kinds: ["warmup"] },
  "glute-bridge-warm": { id: "glute-bridge-warm", name: "글루트 브릿지(워밍)", kinds: ["warmup"] },
  "jumping-jack": { id: "jumping-jack", name: "점프잭", kinds: ["warmup"], defaultMin: 1 },
  "wrist-circle": { id: "wrist-circle", name: "손목 회전", kinds: ["warmup"] },
  "push-up-warm": { id: "push-up-warm", name: "푸시업 워밍업", kinds: ["warmup"] },

  // ── 정적 스트레칭 / 마무리
  "chest-door-stretch": {
    id: "chest-door-stretch",
    name: "도어 가슴 스트레칭",
    kinds: ["cooldown"],
  },
  "shoulder-cross-stretch": {
    id: "shoulder-cross-stretch",
    name: "어깨 크로스 스트레칭",
    kinds: ["cooldown"],
  },
  "child-pose": { id: "child-pose", name: "차일드 포즈", kinds: ["cooldown"] },
  "cobra-stretch": { id: "cobra-stretch", name: "코브라 스트레칭", kinds: ["cooldown"] },
  "lat-stretch": { id: "lat-stretch", name: "광배 스트레칭", kinds: ["cooldown"] },
  "sleeper-stretch": { id: "sleeper-stretch", name: "슬리퍼 스트레칭", kinds: ["cooldown"] },
  "triceps-overhead-stretch": {
    id: "triceps-overhead-stretch",
    name: "삼두 머리 위 스트레칭",
    kinds: ["cooldown"],
  },
  "biceps-door-stretch": {
    id: "biceps-door-stretch",
    name: "이두 도어 스트레칭",
    kinds: ["cooldown"],
  },
  "wrist-stretch": { id: "wrist-stretch", name: "손목 스트레칭", kinds: ["cooldown"] },
  "hamstring-stretch": {
    id: "hamstring-stretch",
    name: "햄스트링 스트레칭",
    kinds: ["cooldown"],
  },
  "pigeon-pose": { id: "pigeon-pose", name: "비둘기 자세", kinds: ["cooldown"] },
  "calf-stretch": { id: "calf-stretch", name: "카프 스트레칭", kinds: ["cooldown"] },
  "neck-stretch": { id: "neck-stretch", name: "목 스트레칭", kinds: ["cooldown"] },
};

const ALL = Object.values(ITEMS);

export function conditioningOptions(kind: ConditioningKind): ConditioningItem[] {
  return ALL.filter((i) => i.kinds.includes(kind));
}

export function getConditioningItem(id: string): ConditioningItem | undefined {
  return ITEMS[id];
}

export function isConditioningKind(v: unknown): v is ConditioningKind {
  return v === "warmup" || v === "cooldown";
}

/** 부위별 추천 워밍업 (item id × 3) */
const WARMUP_DEFAULTS: Record<FocusKey, string[]> = {
  chest: ["shoulder-circle", "push-up-warm", "band-pull-apart"],
  back: ["cat-cow", "dead-hang", "band-pull-apart"],
  shoulder: ["shoulder-circle", "wall-slide", "band-pull-apart"],
  arm: ["wrist-circle", "shoulder-circle", "push-up-warm"],
  lower: ["hip-circle", "dynamic-lunge", "bw-squat"],
  push: ["shoulder-circle", "push-up-warm", "band-pull-apart"],
  pull: ["dead-hang", "cat-cow", "band-pull-apart"],
  fullbody: ["jumping-jack", "dynamic-lunge", "bw-squat"],
  upper: ["shoulder-circle", "cat-cow", "push-up-warm"],
  core: ["cat-cow", "dead-bug", "glute-bridge-warm"],
};

/** 부위별 추천 마무리 (item id × 3) */
const COOLDOWN_DEFAULTS: Record<FocusKey, string[]> = {
  chest: ["chest-door-stretch", "shoulder-cross-stretch", "child-pose"],
  back: ["child-pose", "cobra-stretch", "lat-stretch"],
  shoulder: ["shoulder-cross-stretch", "sleeper-stretch", "neck-stretch"],
  arm: ["triceps-overhead-stretch", "biceps-door-stretch", "wrist-stretch"],
  lower: ["hamstring-stretch", "pigeon-pose", "calf-stretch"],
  push: ["chest-door-stretch", "triceps-overhead-stretch", "shoulder-cross-stretch"],
  pull: ["child-pose", "lat-stretch", "hamstring-stretch"],
  fullbody: ["hamstring-stretch", "chest-door-stretch", "child-pose"],
  upper: ["chest-door-stretch", "shoulder-cross-stretch", "child-pose"],
  core: ["child-pose", "cobra-stretch", "cat-cow"],
};

export function defaultsFor(
  tone: FocusTone,
  kind: ConditioningKind,
): string[] {
  if (tone === "rest") return [];
  return (kind === "warmup" ? WARMUP_DEFAULTS : COOLDOWN_DEFAULTS)[tone];
}
