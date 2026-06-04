/**
 * 부위별 밸런스 색상 매핑 — 순수 모듈(렌더링/three 없음, 테스트 가능).
 *
 * 점수 화면의 부위 색상은 BodyRegion(가슴/등/어깨/팔/다리/코어, "leg") 키로 계산되고,
 * 3D 마네킹은 MuscleId(가슴/등/어깨/팔/하체/코어, "lower") 키를 쓴다.
 * 이 함수가 둘 사이를 매핑한다(leg → lower, 나머지는 동일).
 */

import type { BodyRegion } from "@/features/routine/components/mannequin";
import type { MuscleId } from "@/features/routine/muscle-map";

/** BodyRegion(점수) 색상 맵 → MuscleId(3D 마네킹) 색상 맵. */
export function balanceColorsByMuscle(
  colors: Partial<Record<BodyRegion, string>>,
): Partial<Record<MuscleId, string>> {
  return {
    chest: colors.chest,
    back: colors.back,
    shoulder: colors.shoulder,
    arm: colors.arm,
    core: colors.core,
    lower: colors.leg, // 점수의 "leg" → 마네킹의 "lower"
  };
}