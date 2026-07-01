/**
 * 한국어 근육/부위 이름 → react-body-highlighter 근육명 매핑(순수 모듈, 단위 테스트 가능).
 * 루틴 일자 요약의 '자극 부위' 이름 배열(예: 대퇴사두·둔근·복근·유산소)을 인체 그림으로
 * 표현할 때 쓴다. (Muscle 은 타입만 import → 런타임 의존 없음.)
 */

import type { Muscle } from "react-body-highlighter";

/** 한국어 근육/부위 이름 → 하이라이트할 근육명(복수 가능). */
export const KO_NAME_TO_MUSCLES: Record<string, Muscle[]> = {
  // 큰 부위
  가슴: ["chest"],
  등: ["upper-back", "lower-back"],
  어깨: ["front-deltoids", "back-deltoids"],
  팔: ["biceps", "triceps", "forearm"],
  하체: ["quadriceps", "hamstring", "gluteal", "calves"],
  코어: ["abs", "obliques"],
  // 가슴 세부
  대흉근: ["chest"],
  "상부 대흉근": ["chest"],
  "중부 대흉근": ["chest"],
  "하부 대흉근": ["chest"],
  "내측 대흉근": ["chest"],
  // 등 세부
  광배근: ["upper-back"],
  능형근: ["upper-back"],
  승모근: ["trapezius"],
  척추기립근: ["lower-back"],
  // 어깨 세부
  삼각근: ["front-deltoids", "back-deltoids"],
  "전면 삼각근": ["front-deltoids"],
  "측면 삼각근": ["front-deltoids"],
  "후면 삼각근": ["back-deltoids"],
  // 팔 세부
  이두: ["biceps"],
  삼두: ["triceps"],
  전완: ["forearm"],
  // 하체 세부
  대퇴사두: ["quadriceps"],
  햄스트링: ["hamstring"],
  둔근: ["gluteal"],
  종아리: ["calves"],
  내전근: ["adductor"],
  // 코어 세부
  복근: ["abs"],
  상복부: ["abs"],
  하복부: ["abs"],
  복사근: ["obliques"],
  // 유산소는 특정 근육이 없어 매핑하지 않는다(하이라이트 없음).
};

/** 한국어 근육/부위 이름 배열 → 하이라이트할 근육(중복 제거). */
export function musclesForKoreanNames(names: readonly string[]): Muscle[] {
  const set = new Set<Muscle>();
  for (const n of names) {
    for (const m of KO_NAME_TO_MUSCLES[n] ?? []) set.add(m);
  }
  return [...set];
}
