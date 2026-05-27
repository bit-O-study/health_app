/**
 * 운동별 "조심해야 할 포인트" 데이터.
 * 각 포인트: 해부학적 위치(figure 캔버스 기준 %) + 한 줄 주의사항.
 * 가이드 오버레이의 펄스 마커 + 순환 텍스트 데이터 소스.
 */

import type { BodyPart } from "@/features/routine/exercise-catalog";

/** 마커 한 개 */
export type CautionPoint = {
  /** figure SVG 좌상단 기준 X 위치 (%) — 0~100 */
  x: number;
  /** Y 위치 (%) — 0~100 */
  y: number;
  /** 짧은 라벨 (마커 옆에 작게 표시될 수 있음) */
  label: string;
  /** 길게 설명 — 아래 카드에서 순환 */
  tip: string;
};

/** 운동별 조심 포인트 — 본운동 id 기준 */
export const EXERCISE_CAUTIONS: Record<string, CautionPoint[]> = {
  "bench-press": [
    { x: 30, y: 32, label: "어깨", tip: "어깨가 위로 으쓱하지 않게 — 견갑을 모아 벤치에 고정" },
    { x: 70, y: 32, label: "어깨", tip: "어깨가 위로 으쓱하지 않게 — 견갑을 모아 벤치에 고정" },
    { x: 22, y: 50, label: "팔꿈치", tip: "팔꿈치는 45도 — 너무 벌어지면 어깨 부상" },
    { x: 78, y: 50, label: "팔꿈치", tip: "팔꿈치는 45도 — 너무 벌어지면 어깨 부상" },
    { x: 50, y: 60, label: "허리", tip: "허리 아치는 자연스럽게 — 과하게 들리면 부상" },
  ],
  "incline-press": [
    { x: 30, y: 30, label: "어깨", tip: "어깨가 으쓱하지 않게 — 견갑 고정" },
    { x: 70, y: 30, label: "어깨", tip: "어깨가 으쓱하지 않게 — 견갑 고정" },
    { x: 50, y: 60, label: "허리", tip: "허리 과신전 금지 — 코어 잠그기" },
  ],
  ohp: [
    { x: 50, y: 18, label: "목", tip: "목·승모근 긴장 빼기" },
    { x: 30, y: 35, label: "어깨", tip: "어깨가 귀쪽으로 솟지 않게" },
    { x: 70, y: 35, label: "어깨", tip: "어깨가 귀쪽으로 솟지 않게" },
    { x: 50, y: 55, label: "허리", tip: "허리 아치 과하지 않게 — 코어 잠그기" },
  ],
  squat: [
    { x: 50, y: 50, label: "허리", tip: "허리 둥글지 않게 — 골반 말림(butt wink) 주의" },
    { x: 35, y: 70, label: "무릎", tip: "무릎이 발끝 안쪽으로 무너지지 않게" },
    { x: 65, y: 70, label: "무릎", tip: "무릎이 발끝 안쪽으로 무너지지 않게" },
    { x: 50, y: 90, label: "발", tip: "발 전체로 밀기 — 발끝만 디디면 무릎 부담" },
  ],
  "front-squat": [
    { x: 50, y: 25, label: "팔꿈치", tip: "팔꿈치를 높게 유지 — 떨어지면 바가 굴러떨어짐" },
    { x: 50, y: 50, label: "허리", tip: "허리 펴고 코어 잠그기" },
    { x: 35, y: 70, label: "무릎", tip: "무릎이 안쪽으로 무너지지 않게" },
    { x: 65, y: 70, label: "무릎", tip: "무릎이 안쪽으로 무너지지 않게" },
  ],
  deadlift: [
    { x: 50, y: 45, label: "허리", tip: "허리 둥글지 않게 — 척추 중립" },
    { x: 50, y: 35, label: "어깨", tip: "어깨는 바보다 살짝 앞쪽 — 능동 견갑" },
    { x: 35, y: 70, label: "무릎", tip: "무릎이 안쪽으로 들어오지 않게" },
    { x: 65, y: 70, label: "무릎", tip: "무릎이 안쪽으로 들어오지 않게" },
  ],
  "sumo-deadlift": [
    { x: 50, y: 45, label: "허리", tip: "허리 둥글지 않게 척추 중립 유지" },
    { x: 35, y: 75, label: "무릎", tip: "무릎이 발끝 방향과 일치하게" },
    { x: 65, y: 75, label: "무릎", tip: "무릎이 발끝 방향과 일치하게" },
  ],
  rdl: [
    { x: 50, y: 45, label: "허리", tip: "허리 펴고 골반 뒤로 — 햄스트링에 자극" },
    { x: 35, y: 65, label: "무릎", tip: "무릎은 살짝만 굽힘 — 너무 굽히면 데드리프트화" },
    { x: 65, y: 65, label: "무릎", tip: "무릎은 살짝만 굽힘 — 너무 굽히면 데드리프트화" },
  ],
  "barbell-row": [
    { x: 50, y: 50, label: "허리", tip: "허리 둥글지 않게 — 척추 중립" },
    { x: 50, y: 35, label: "팔/등", tip: "팔이 아니라 등으로 당기기 — 견갑 모으기" },
    { x: 50, y: 70, label: "무릎", tip: "무릎 살짝 굽혀 고정" },
  ],
  "lat-pulldown": [
    { x: 50, y: 25, label: "어깨", tip: "어깨가 귀로 솟지 않게 — 견갑 하강 먼저" },
    { x: 50, y: 50, label: "등", tip: "팔이 아닌 등으로 — 견갑 모으기" },
    { x: 50, y: 75, label: "허리", tip: "허리 과한 아치 금지 — 자연스럽게" },
  ],
  "pull-up": [
    { x: 50, y: 25, label: "어깨", tip: "어깨가 으쓱하지 않게 — 견갑 하강" },
    { x: 50, y: 50, label: "코어", tip: "코어 잠그고 다리 흔들리지 않게" },
  ],
  "chin-up": [
    { x: 50, y: 25, label: "어깨", tip: "어깨가 으쓱하지 않게" },
    { x: 50, y: 50, label: "팔꿈치", tip: "팔꿈치를 갈비뼈 쪽으로 끌어내리기" },
  ],
  "biceps-curl": [
    { x: 50, y: 45, label: "팔꿈치", tip: "팔꿈치를 옆구리에 고정 — 앞뒤로 흔들지 않기" },
    { x: 50, y: 30, label: "어깨", tip: "어깨가 위로 솟지 않게" },
    { x: 50, y: 55, label: "손목", tip: "손목이 꺾이지 않게 — 일직선 유지" },
  ],
  "hammer-curl": [
    { x: 50, y: 45, label: "팔꿈치", tip: "팔꿈치 고정 — 흔들지 않기" },
    { x: 50, y: 55, label: "손목", tip: "손목 일직선 유지" },
  ],
  "triceps-pushdown": [
    { x: 50, y: 30, label: "어깨", tip: "어깨가 들리지 않게 — 견갑 하강 고정" },
    { x: 50, y: 45, label: "팔꿈치", tip: "팔꿈치는 옆구리에 고정 — 위팔만 움직임" },
  ],
  "skull-crusher": [
    { x: 50, y: 30, label: "팔꿈치", tip: "팔꿈치 위치 고정 — 흔들지 않기 (얼굴 다칠 위험)" },
    { x: 50, y: 22, label: "어깨", tip: "어깨가 으쓱하지 않게" },
  ],
  "leg-press": [
    { x: 50, y: 70, label: "허리", tip: "허리가 시트에서 뜨지 않을 만큼만 내리기" },
    { x: 35, y: 50, label: "무릎", tip: "무릎이 안쪽으로 무너지지 않게" },
    { x: 65, y: 50, label: "무릎", tip: "무릎이 안쪽으로 무너지지 않게" },
  ],
  lunge: [
    { x: 50, y: 50, label: "허리", tip: "상체 세우고 코어 잠그기" },
    { x: 35, y: 75, label: "무릎", tip: "앞 무릎이 발끝 안쪽으로 무너지지 않게" },
    { x: 65, y: 80, label: "발끝", tip: "뒷발 발등이 아래로 — 통제하며 내림" },
  ],
  "hip-thrust": [
    { x: 50, y: 30, label: "갈비", tip: "갈비뼈가 위로 들리지 않게 — 코어 잠그기" },
    { x: 50, y: 60, label: "허리", tip: "허리 과신전 금지 — 중립 유지" },
    { x: 35, y: 75, label: "무릎", tip: "무릎이 안쪽으로 무너지지 않게" },
    { x: 65, y: 75, label: "무릎", tip: "무릎이 안쪽으로 무너지지 않게" },
  ],
  "lateral-raise": [
    { x: 50, y: 20, label: "목", tip: "목·승모근 긴장 빼기" },
    { x: 30, y: 40, label: "어깨", tip: "어깨가 으쓱하지 않게 — 견갑 하강" },
    { x: 70, y: 40, label: "어깨", tip: "어깨가 으쓱하지 않게 — 견갑 하강" },
  ],
  "face-pull": [
    { x: 50, y: 25, label: "목", tip: "목 긴장 빼기" },
    { x: 30, y: 40, label: "어깨", tip: "팔꿈치 높게 — 어깨 외회전" },
    { x: 70, y: 40, label: "어깨", tip: "팔꿈치 높게 — 어깨 외회전" },
  ],
  "rear-delt-fly": [
    { x: 50, y: 45, label: "허리", tip: "허리 둥글지 않게 — 척추 중립" },
    { x: 30, y: 40, label: "어깨", tip: "팔꿈치 살짝 굽힘 유지 — 펴진 채 무리하지 않기" },
    { x: 70, y: 40, label: "어깨", tip: "팔꿈치 살짝 굽힘 유지 — 펴진 채 무리하지 않기" },
  ],
  "chest-fly": [
    { x: 30, y: 40, label: "팔꿈치", tip: "팔꿈치 살짝 굽힘 유지 — 펴진 채 무리하지 않기" },
    { x: 70, y: 40, label: "팔꿈치", tip: "팔꿈치 살짝 굽힘 유지 — 펴진 채 무리하지 않기" },
    { x: 30, y: 30, label: "어깨", tip: "어깨가 으쓱하지 않게" },
    { x: 70, y: 30, label: "어깨", tip: "어깨가 으쓱하지 않게" },
  ],
  dips: [
    { x: 30, y: 35, label: "어깨", tip: "어깨가 너무 깊게 내려가지 않게 — 통증 시 중단" },
    { x: 70, y: 35, label: "어깨", tip: "어깨가 너무 깊게 내려가지 않게 — 통증 시 중단" },
    { x: 50, y: 55, label: "코어", tip: "다리 흔들리지 않게 코어 잠그기" },
  ],
  "push-up": [
    { x: 50, y: 50, label: "코어/허리", tip: "엉덩이가 처지지 않게 — 머리부터 발끝 일직선" },
    { x: 30, y: 40, label: "팔꿈치", tip: "팔꿈치 45도 — 너무 벌리면 어깨 부상" },
    { x: 70, y: 40, label: "팔꿈치", tip: "팔꿈치 45도 — 너무 벌리면 어깨 부상" },
  ],
  plank: [
    { x: 50, y: 30, label: "엉덩이", tip: "엉덩이가 위로 솟거나 아래로 처지지 않게 — 일직선 유지" },
    { x: 50, y: 50, label: "허리", tip: "허리가 꺾이지 않게 — 코어 잠그기" },
  ],
  "hanging-leg-raise": [
    { x: 50, y: 20, label: "어깨", tip: "어깨가 으쓱하지 않게 — 견갑 하강" },
    { x: 50, y: 60, label: "코어", tip: "반동 없이 — 다리 천천히 올렸다 내림" },
  ],
};

/** body part 별 일반 fallback 주의사항 (운동별 매핑 없을 때 사용) */
export const FALLBACK_CAUTIONS: Record<BodyPart, string[]> = {
  chest: [
    "어깨가 으쓱하지 않게 — 견갑 고정",
    "팔꿈치 위치 통제 — 너무 벌리지 않기",
    "허리 아치는 자연스럽게",
  ],
  back: [
    "허리 둥글지 않게 — 척추 중립",
    "팔이 아닌 등으로 — 견갑 모으기",
    "어깨가 귀쪽으로 솟지 않게",
  ],
  shoulder: [
    "목·승모근 긴장 빼기",
    "어깨가 으쓱하지 않게 — 견갑 하강",
    "반동 없이 통제하며 들기",
  ],
  arm: [
    "팔꿈치 흔들리지 않게 — 옆구리에 고정",
    "손목이 꺾이지 않게 — 일직선",
    "반동 없이 통제하며",
  ],
  lower: [
    "무릎이 안쪽으로 무너지지 않게",
    "허리는 펴고 — 척추 중립",
    "발 전체로 균등하게 디디기",
  ],
  core: [
    "허리가 들리지 않게 — 바닥에 붙이거나 일직선",
    "엉덩이가 처지지 않게",
    "호흡 멈추지 말고 자연스럽게",
  ],
};

/** body part 별 fallback 주의사항을 CautionPoint 형태로 (위치는 합리적 추정) */
export function fallbackPointsForBodyPart(part: BodyPart): CautionPoint[] {
  const tips = FALLBACK_CAUTIONS[part];
  const positions: Record<BodyPart, { x: number; y: number; label: string }[]> =
    {
      chest: [
        { x: 30, y: 35, label: "어깨" },
        { x: 70, y: 35, label: "어깨" },
        { x: 50, y: 55, label: "허리" },
      ],
      back: [
        { x: 50, y: 45, label: "허리" },
        { x: 50, y: 30, label: "등/어깨" },
        { x: 50, y: 20, label: "목" },
      ],
      shoulder: [
        { x: 30, y: 35, label: "어깨" },
        { x: 70, y: 35, label: "어깨" },
        { x: 50, y: 20, label: "목" },
      ],
      arm: [
        { x: 50, y: 40, label: "팔꿈치" },
        { x: 50, y: 55, label: "손목" },
        { x: 50, y: 30, label: "어깨" },
      ],
      lower: [
        { x: 50, y: 50, label: "허리" },
        { x: 35, y: 70, label: "무릎" },
        { x: 65, y: 70, label: "무릎" },
      ],
      core: [
        { x: 50, y: 50, label: "허리/엉덩이" },
        { x: 50, y: 35, label: "어깨" },
        { x: 50, y: 65, label: "다리" },
      ],
    };
  const pos = positions[part];
  return tips.slice(0, pos.length).map((tip, i) => ({
    x: pos[i].x,
    y: pos[i].y,
    label: pos[i].label,
    tip,
  }));
}
