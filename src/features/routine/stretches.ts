/**
 * 부위별 워밍업 스트레칭 + 마무리 운동 (정적 데이터).
 * 메인 "오늘 할 운동" 섹션에서 본운동과 함께 표시.
 */

import type { FocusTone } from "@/features/routine/data";
import type { FocusKey } from "@/features/routine/exercise-catalog";

export type StretchItem = { name: string; detail: string };

const WARMUP: Record<FocusKey, StretchItem[]> = {
  chest: [
    { name: "어깨 회전", detail: "전·후 각 10회" },
    { name: "흉부 스트레칭", detail: "30초 × 2" },
    { name: "가벼운 푸시업", detail: "10회" },
  ],
  back: [
    { name: "캣카우", detail: "10회" },
    { name: "데드행", detail: "20초 × 2" },
    { name: "밴드 풀어파트", detail: "15회" },
  ],
  shoulder: [
    { name: "어깨 회전", detail: "전·후 각 10회" },
    { name: "월 슬라이드", detail: "10회" },
    { name: "밴드 풀어파트", detail: "15회" },
  ],
  arm: [
    { name: "손목 회전", detail: "양쪽 각 10회" },
    { name: "가벼운 컬 워밍업", detail: "15회 × 2" },
    { name: "어깨 회전", detail: "전·후 각 10회" },
  ],
  lower: [
    { name: "힙 서클", detail: "각 방향 10회" },
    { name: "다이나믹 런지", detail: "양쪽 각 10회" },
    { name: "보디웨이트 스쿼트", detail: "15회" },
  ],
  push: [
    { name: "어깨 회전", detail: "전·후 각 10회" },
    { name: "푸시업 워밍업", detail: "10회" },
    { name: "가슴 스트레칭", detail: "30초 × 2" },
  ],
  pull: [
    { name: "데드행", detail: "20초 × 2" },
    { name: "캣카우", detail: "10회" },
    { name: "밴드 풀어파트", detail: "15회" },
  ],
  fullbody: [
    { name: "점프잭", detail: "30초" },
    { name: "다이나믹 런지", detail: "양쪽 각 10회" },
    { name: "보디웨이트 스쿼트", detail: "15회" },
  ],
  upper: [
    { name: "어깨 회전", detail: "전·후 각 10회" },
    { name: "캣카우", detail: "10회" },
    { name: "푸시업 워밍업", detail: "10회" },
  ],
  core: [
    { name: "캣카우", detail: "10회" },
    { name: "데드버그", detail: "양쪽 각 10회" },
    { name: "글루트 브릿지", detail: "10회" },
  ],
};

const COOLDOWN: Record<FocusKey, StretchItem[]> = {
  chest: [
    { name: "도어 가슴 스트레칭", detail: "30초 × 양쪽" },
    { name: "어깨 크로스 스트레칭", detail: "30초 × 양쪽" },
    { name: "차일드 포즈", detail: "30초" },
  ],
  back: [
    { name: "차일드 포즈", detail: "30초" },
    { name: "코브라 스트레칭", detail: "30초" },
    { name: "광배 스트레칭", detail: "30초 × 양쪽" },
  ],
  shoulder: [
    { name: "크로스바디 스트레칭", detail: "30초 × 양쪽" },
    { name: "슬리퍼 스트레칭", detail: "30초 × 양쪽" },
    { name: "목 스트레칭", detail: "30초 × 양쪽" },
  ],
  arm: [
    { name: "삼두 머리 위 스트레칭", detail: "30초 × 양쪽" },
    { name: "이두 도어 스트레칭", detail: "30초 × 양쪽" },
    { name: "손목 스트레칭", detail: "30초 × 양쪽" },
  ],
  lower: [
    { name: "햄스트링 스트레칭", detail: "30초 × 양쪽" },
    { name: "비둘기 자세(둔근)", detail: "30초 × 양쪽" },
    { name: "카프 스트레칭", detail: "30초 × 양쪽" },
  ],
  push: [
    { name: "도어 가슴 스트레칭", detail: "30초 × 양쪽" },
    { name: "삼두 머리 위 스트레칭", detail: "30초 × 양쪽" },
    { name: "어깨 크로스 스트레칭", detail: "30초 × 양쪽" },
  ],
  pull: [
    { name: "차일드 포즈", detail: "30초" },
    { name: "광배 스트레칭", detail: "30초 × 양쪽" },
    { name: "햄스트링 스트레칭", detail: "30초 × 양쪽" },
  ],
  fullbody: [
    { name: "햄스트링 스트레칭", detail: "30초 × 양쪽" },
    { name: "도어 가슴 스트레칭", detail: "30초 × 양쪽" },
    { name: "차일드 포즈", detail: "30초" },
  ],
  upper: [
    { name: "도어 가슴 스트레칭", detail: "30초 × 양쪽" },
    { name: "어깨 크로스 스트레칭", detail: "30초 × 양쪽" },
    { name: "차일드 포즈", detail: "30초" },
  ],
  core: [
    { name: "차일드 포즈", detail: "30초" },
    { name: "코브라 스트레칭", detail: "30초" },
    { name: "캣카우", detail: "10회" },
  ],
};

export function warmupsFor(tone: FocusTone): StretchItem[] {
  if (tone === "rest") return [];
  return WARMUP[tone];
}

export function cooldownsFor(tone: FocusTone): StretchItem[] {
  if (tone === "rest") return [];
  return COOLDOWN[tone];
}
