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
  /** 한 줄 설명 (목적·자극·효과 등) */
  target?: string;
  /** 동작 방법 단계 (보통 3단계) */
  method?: string[];
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
    target: "심박수·체온 상승, 하체 워밍업 또는 가벼운 유산소 마무리",
    method: [
      "트레드밀에 올라 안전키 부착 후 6km/h 부근에서 시작",
      "처음 1~2분은 가볍게 걷다가 목표 속도까지 1~2분에 걸쳐 올리기",
      "착지는 발 전체로, 시선은 정면 — 손잡이는 잡지 않고 팔도 자연스럽게 흔들기",
    ],
  },
  "stair-master": {
    id: "stair-master",
    name: "천국의 계단",
    kinds: ["warmup", "cooldown"],
    params: ["duration", "speed", "incline"],
    defaultMin: 10,
    defaultSpeed: 50,
    defaultIncline: 10,
    target: "둔근·햄스트링 활성화 + 심폐 강도 높이는 유산소",
    method: [
      "발 전체로 계단을 디뎌 발뒤꿈치까지 닿게 (앞꿈치만 디디지 않기)",
      "상체는 살짝 앞으로 기울이고 손잡이는 가볍게 — 체중 의존 금지",
      "속도는 대화는 어렵지만 끊기지는 않는 강도(RPE 6~7)",
    ],
  },
  cycling: {
    id: "cycling",
    name: "사이클",
    kinds: ["warmup", "cooldown"],
    params: ["duration", "speed", "incline"],
    defaultMin: 5,
    defaultSpeed: 20,
    target: "무릎 부담 적은 하체 워밍업·회복 유산소",
    method: [
      "안장 높이는 페달 가장 아래일 때 무릎이 살짝(15°) 굽혀지는 정도로",
      "발은 페달 안쪽 가운데, 무릎이 안쪽으로 모이지 않게",
      "워밍업은 가볍게 회전 빠르게, 마무리는 저강도로 5분",
    ],
  },
  rowing: {
    id: "rowing",
    name: "로잉 머신",
    kinds: ["warmup"],
    params: ["duration", "speed"],
    defaultMin: 5,
    target: "전신 워밍업 — 등·다리·코어 동시에",
    method: [
      "다리 → 엉덩이 → 등 → 팔 순서로 밀고, 복귀는 역순(팔 → 등 → 엉덩이 → 다리)",
      "허리는 항상 펴고 등으로 당기기 — 팔로만 당기지 말 것",
      "리듬 1:2 (당기는 시간 1, 돌아가는 시간 2)",
    ],
  },
  elliptical: {
    id: "elliptical",
    name: "일립티컬",
    kinds: ["warmup", "cooldown"],
    params: ["duration", "speed", "incline"],
    defaultMin: 5,
    target: "관절 부담 적은 저충격 유산소",
    method: [
      "발판에 발 전체를 안정적으로, 손잡이는 가볍게 잡기",
      "상체 세우고 팔·다리 자연스럽게 반대 방향으로",
      "워밍업은 5~7 강도, 마무리는 3~4 강도로 천천히",
    ],
  },
  "jump-rope": {
    id: "jump-rope",
    name: "줄넘기",
    kinds: ["warmup"],
    params: ["duration"],
    defaultMin: 3,
    target: "심박수·종아리 활성화 워밍업",
    method: [
      "팔꿈치는 옆구리에 고정, 손목으로만 줄 돌리기",
      "발 앞꿈치로 가볍게 튕기듯 — 너무 높이 뛰지 않기",
      "처음 30초 가볍게 시작 → 점차 속도 증가",
    ],
  },
  walking: {
    id: "walking",
    name: "걷기",
    kinds: ["warmup", "cooldown"],
    params: ["duration", "speed", "incline"],
    defaultMin: 5,
    defaultSpeed: 5,
    target: "가벼운 워밍업 또는 정리 유산소 (회복)",
    method: [
      "어깨 펴고 시선 정면, 팔은 자연스럽게 흔들기",
      "발뒤꿈치 → 발바닥 → 발 앞꿈치 순서로 굴리며 디디기",
      "워밍업은 5~6km/h, 마무리는 4km/h 정도로 천천히",
    ],
  },

  // ── 모빌리티 / 워밍업 동작 (모두 duration 입력 지원)
  "shoulder-circle": {
    id: "shoulder-circle",
    name: "어깨 회전",
    kinds: ["warmup"],
    params: ["duration"],
    defaultMin: 1,
    target: "어깨·회전근개 가동성 — 푸시/풀 운동 전",
    method: [
      "양손을 어깨 위에 가볍게 올리기",
      "팔꿈치로 큰 원을 그리며 앞으로 10회 회전",
      "뒤로 10회 회전 — 어깨 으쓱이지 않게 천천히",
    ],
  },
  "cat-cow": {
    id: "cat-cow",
    name: "캣카우",
    kinds: ["warmup", "cooldown"],
    params: ["duration"],
    defaultMin: 1,
    target: "척추 분절 가동성·코어 활성화",
    method: [
      "네 발 자세로 손은 어깨 아래, 무릎은 골반 아래",
      "들숨에 가슴·꼬리뼈 위로 (소 자세) — 등 가운데 살짝 들어가게",
      "날숨에 등 둥글게 말기 (고양이 자세) — 천천히 반복",
    ],
  },
  "dead-hang": {
    id: "dead-hang",
    name: "데드행",
    kinds: ["warmup"],
    params: ["duration"],
    defaultMin: 1,
    target: "광배·악력 활성화, 어깨 신연 — 등 운동 전",
    method: [
      "풀업 바를 어깨너비로 잡고 완전히 매달리기",
      "어깨를 귀에서 멀리 (견갑 하강) — 어깨가 으쓱하지 않게",
      "20~30초 유지, 호흡 자연스럽게",
    ],
  },
  "band-pull-apart": {
    id: "band-pull-apart",
    name: "밴드 풀어파트",
    kinds: ["warmup"],
    params: ["duration"],
    defaultMin: 1,
    target: "후면 삼각근·능형근 활성화 — 가슴·어깨 운동 전",
    method: [
      "양손에 밴드를 어깨너비로 잡고 팔 앞으로",
      "팔꿈치 살짝 굽힌 채 양옆으로 당겨 견갑 모으기",
      "통제하며 천천히 돌아오기 — 어깨 으쓱 금지",
    ],
  },
  "wall-slide": {
    id: "wall-slide",
    name: "월 슬라이드",
    kinds: ["warmup"],
    params: ["duration"],
    defaultMin: 1,
    target: "어깨 가동성·후면 견갑 안정성",
    method: [
      '벽에 등·엉덩이·뒤통수 밀착, 팔꿈치 90도로 "W" 자세',
      '팔등을 벽에 닿게 유지하며 "Y" 자세로 천천히 올리기',
      "다시 W 로 — 어깨가 으쓱하지 않게 통제",
    ],
  },
  "dynamic-lunge": {
    id: "dynamic-lunge",
    name: "다이나믹 런지",
    kinds: ["warmup"],
    params: ["duration"],
    defaultMin: 2,
    target: "고관절·대퇴 가동성 — 하체 운동 전",
    method: [
      "한 발 크게 앞으로 디뎌 무릎 90도까지 내리기",
      "상체 세우고 코어 단단히 — 앞 무릎 발끝 방향 일치",
      "앞발로 밀어 일어나 다음 보, 좌우 번갈아 10~12회",
    ],
  },
  "bw-squat": {
    id: "bw-squat",
    name: "보디웨이트 스쿼트",
    kinds: ["warmup"],
    params: ["duration"],
    defaultMin: 2,
    target: "전체 하체 활성화 — 본운동 전 가동범위 확보",
    method: [
      "발 어깨너비, 발끝 살짝 바깥, 팔은 앞으로 균형용",
      "엉덩이 뒤로 보내며 허벅지 평행까지 앉기",
      "발 전체로 밀어 일어서기 — 10~15회 가볍게",
    ],
  },
  "hip-circle": {
    id: "hip-circle",
    name: "힙 서클",
    kinds: ["warmup"],
    params: ["duration"],
    defaultMin: 1,
    target: "고관절 가동성·둔근 활성화",
    method: [
      "양손 골반에 두고 다리 어깨너비",
      "엉덩이로 큰 원을 그리며 시계 방향 10회",
      "반시계 방향 10회 — 무릎은 살짝 굽힌 채",
    ],
  },
  "dead-bug": {
    id: "dead-bug",
    name: "데드버그",
    kinds: ["warmup"],
    params: ["duration"],
    defaultMin: 1,
    target: "코어 활성화·허리 안정성 — 본운동 전",
    method: [
      "누워서 양 무릎·고관절 90도, 양손 천장 향해 뻗기",
      "오른팔과 왼다리를 동시에 천천히 바닥 가까이 내리기",
      "허리가 뜨지 않게 유지하며 반대편 — 좌우 10회",
    ],
  },
  "glute-bridge-warm": {
    id: "glute-bridge-warm",
    name: "글루트 브릿지(워밍)",
    kinds: ["warmup"],
    params: ["duration"],
    defaultMin: 1,
    target: "둔근 활성화 — 하체·힙 스러스트 전",
    method: [
      "무릎 세워 눕고 발은 엉덩이 가까이",
      "둔근 조여 엉덩이를 들어 어깨~무릎이 일직선",
      "정점에서 1초 정지 후 천천히 내리기 — 15회",
    ],
  },
  "jumping-jack": {
    id: "jumping-jack",
    name: "점프잭",
    kinds: ["warmup"],
    params: ["duration"],
    defaultMin: 1,
    target: "심박수·체온 빠르게 올리는 전신 워밍업",
    method: [
      "다리 모은 채 차렷 자세에서 시작",
      "점프하며 다리 벌리고 양팔 머리 위로",
      "다시 점프하며 시작 자세로 — 30~60초",
    ],
  },
  "wrist-circle": {
    id: "wrist-circle",
    name: "손목 회전",
    kinds: ["warmup"],
    params: ["duration"],
    defaultMin: 1,
    target: "손목 가동성·관절 윤활 — 푸시·컬 운동 전",
    method: [
      "양손을 깍지 끼고 가슴 앞에 두기",
      "손목으로 큰 원을 그리며 시계 방향 10회",
      "반시계 방향 10회 — 양쪽 손목 따로 돌려도 OK",
    ],
  },
  "push-up-warm": {
    id: "push-up-warm",
    name: "푸시업 워밍업",
    kinds: ["warmup"],
    params: ["duration"],
    defaultMin: 1,
    target: "가슴·삼두·견갑 활성화 — 푸시 운동 전",
    method: [
      "무릎 푸시업 또는 일반 푸시업으로 5~10회",
      "팔꿈치 45도, 가슴이 바닥 가까이 내려가게",
      "코어 단단히 — 몸이 휘지 않게 일직선 유지",
    ],
  },

  // ── 정적 스트레칭 / 마무리 (모두 duration 입력 지원)
  "chest-door-stretch": {
    id: "chest-door-stretch",
    name: "도어 가슴 스트레칭",
    kinds: ["cooldown"],
    params: ["duration"],
    defaultMin: 1,
    target: "대흉근·전면 삼각근 — 가슴·푸시 운동 후",
    method: [
      "문틀 옆에 서서 팔꿈치 90도로 문틀에 대기",
      "반대쪽 발 한 걸음 앞으로 디뎌 가슴을 앞으로 밀기",
      "20~30초 유지 후 반대쪽 — 통증 없는 강도",
    ],
  },
  "shoulder-cross-stretch": {
    id: "shoulder-cross-stretch",
    name: "어깨 크로스 스트레칭",
    kinds: ["cooldown"],
    params: ["duration"],
    defaultMin: 1,
    target: "후면 삼각근·견갑 — 어깨·등 운동 후",
    method: [
      "한 팔을 가슴 가로질러 반대편으로 뻗기",
      "반대편 손으로 팔꿈치 잡고 몸쪽으로 가볍게 당기기",
      "20~30초 유지 후 반대쪽",
    ],
  },
  "child-pose": {
    id: "child-pose",
    name: "차일드 포즈",
    kinds: ["cooldown"],
    params: ["duration"],
    defaultMin: 1,
    target: "광배·요추 이완 — 등·전신 운동 후",
    method: [
      "무릎 꿇고 엉덩이를 발뒤꿈치 위에 두기",
      "양팔을 앞으로 길게 뻗고 이마는 바닥에",
      "30초~1분 호흡하며 등 늘림 — 어깨가 들리지 않게",
    ],
  },
  "cobra-stretch": {
    id: "cobra-stretch",
    name: "코브라 스트레칭",
    kinds: ["cooldown"],
    params: ["duration"],
    defaultMin: 1,
    target: "복부·요방형근 이완 — 코어·등 운동 후",
    method: [
      "엎드려 누워 손바닥은 가슴 옆에",
      "팔로 천천히 밀어 가슴·어깨를 들어 올리기",
      "골반은 바닥에 붙인 채 20~30초 — 허리 통증 시 중단",
    ],
  },
  "lat-stretch": {
    id: "lat-stretch",
    name: "광배 스트레칭",
    kinds: ["cooldown"],
    params: ["duration"],
    defaultMin: 1,
    target: "광배·체간 측면 이완",
    method: [
      "한 팔을 머리 위로 뻗고 상체를 반대쪽으로 기울이기",
      "옆구리·광배가 늘어남을 느끼며 호흡 유지",
      "20~30초 후 반대쪽",
    ],
  },
  "sleeper-stretch": {
    id: "sleeper-stretch",
    name: "슬리퍼 스트레칭",
    kinds: ["cooldown"],
    params: ["duration"],
    defaultMin: 1,
    target: "후면 회전근개 — 어깨 후방 가동성",
    method: [
      "옆으로 누워 아래쪽 어깨가 바닥에 닿게",
      "아래팔을 90도로 들어 올리고 위팔로 손목을 천천히 바닥 쪽으로",
      "어깨 후면 늘림 — 20~30초 후 반대쪽",
    ],
  },
  "triceps-overhead-stretch": {
    id: "triceps-overhead-stretch",
    name: "삼두 머리 위 스트레칭",
    kinds: ["cooldown"],
    params: ["duration"],
    defaultMin: 1,
    target: "삼두 장두 — 푸시·삼두 운동 후",
    method: [
      "한 팔을 머리 위로 들어 팔꿈치 굽혀 손이 등 가운데",
      "반대편 손으로 팔꿈치를 머리 뒤로 가볍게 밀기",
      "20~30초 유지 후 반대쪽",
    ],
  },
  "biceps-door-stretch": {
    id: "biceps-door-stretch",
    name: "이두 도어 스트레칭",
    kinds: ["cooldown"],
    params: ["duration"],
    defaultMin: 1,
    target: "이두 — 컬 운동 후",
    method: [
      "벽 옆에 서서 한 팔을 어깨 높이로 뒤로 뻗어 손바닥을 벽에",
      "몸을 반대 방향으로 천천히 돌리며 이두 늘리기",
      "20~30초 유지 후 반대쪽",
    ],
  },
  "wrist-stretch": {
    id: "wrist-stretch",
    name: "손목 스트레칭",
    kinds: ["cooldown"],
    params: ["duration"],
    defaultMin: 1,
    target: "전완·손목 — 컬·푸시 운동 후",
    method: [
      "한 팔을 앞으로 뻗어 손바닥이 천장 향하게",
      "반대편 손으로 손가락을 잡고 천천히 아래로 당겨 손목 굴곡",
      "20초 유지 → 손등이 위로 가게 뒤집어 같은 동작",
    ],
  },
  "hamstring-stretch": {
    id: "hamstring-stretch",
    name: "햄스트링 스트레칭",
    kinds: ["cooldown"],
    params: ["duration"],
    defaultMin: 1,
    target: "햄스트링 — 하체·데드 운동 후",
    method: [
      "다리 펴고 서서 천천히 상체를 앞으로 숙이기",
      "허리는 둥글지 않게 펴고, 손은 정강이·발끝 닿는 만큼만",
      "햄스트링 늘림을 느끼며 30초 호흡",
    ],
  },
  "pigeon-pose": {
    id: "pigeon-pose",
    name: "비둘기 자세",
    kinds: ["cooldown"],
    params: ["duration"],
    defaultMin: 1,
    target: "둔근·이상근 — 하체 운동 후",
    method: [
      "앞 다리는 무릎 굽혀 정강이를 가로로, 뒷 다리는 길게 뻗기",
      "상체를 앞 다리 위로 천천히 숙여 둔근 늘리기",
      "30초 유지 후 반대쪽 — 무릎 통증 시 강도 낮추기",
    ],
  },
  "calf-stretch": {
    id: "calf-stretch",
    name: "카프 스트레칭",
    kinds: ["cooldown"],
    params: ["duration"],
    defaultMin: 1,
    target: "비복근·가자미근 — 런닝·카프 운동 후",
    method: [
      "벽에 양손 짚고 한 발 뒤로 길게 뻗기",
      "뒷발 뒤꿈치를 바닥에 붙인 채 앞 무릎을 굽혀 체중 앞으로",
      "20~30초 유지 후 반대쪽",
    ],
  },
  "neck-stretch": {
    id: "neck-stretch",
    name: "목 스트레칭",
    kinds: ["cooldown"],
    params: ["duration"],
    defaultMin: 1,
    target: "승모·후두근 — 어깨 운동 후",
    method: [
      "한 손으로 머리 옆을 잡고 같은 쪽 어깨로 가볍게 당기기",
      "반대편 어깨는 내리며 측면 목 늘림 — 20초",
      "반대쪽 동일하게, 뒤·앞으로 가볍게 늘려도 OK",
    ],
  },
};

const ALL = Object.values(ITEMS);

export function conditioningOptions(
  kind: ConditioningKind,
): ConditioningItem[] {
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
  push: [
    "chest-door-stretch",
    "triceps-overhead-stretch",
    "shoulder-cross-stretch",
  ],
  pull: ["child-pose", "lat-stretch", "hamstring-stretch"],
  fullbody: ["hamstring-stretch", "chest-door-stretch", "child-pose"],
  upper: ["chest-door-stretch", "shoulder-cross-stretch", "child-pose"],
  core: ["child-pose", "cobra-stretch", "cat-cow"],
};

export function defaultsFor(tone: FocusTone, kind: ConditioningKind): string[] {
  if (tone === "rest") return [];
  return (kind === "warmup" ? WARMUP_DEFAULTS : COOLDOWN_DEFAULTS)[tone];
}
