/**
 * 프로필에 체중이 없을 때 쓰는 체중(kg) — 모든 계산이 이 값 하나를 쓴다(2026-10-07 정리).
 * 아주 작은 모듈로 둔다: 화면(클라이언트) 코드도 import 하므로 카탈로그 같은 큰 모듈을 끌고 오면 안 된다.
 */
export const DEFAULT_WEIGHT_KG = 65;

/** 체중 → 계산에 쓸 체중(없거나 0 이하면 기본값). */
export function weightOrDefault(kg: number | string | null | undefined): number {
  const n = Number(kg);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_WEIGHT_KG;
}
