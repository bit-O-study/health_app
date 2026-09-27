/**
 * 운동모드 "밀어서 완료" 판정 — 순수 함수.
 *
 * 헬스장에서 땀 난 손으로 화면을 스치면 '세트 완료' 가 눌려 버리는 일이 잦았다.
 * **터치(손가락·펜)** 는 끝까지 밀어야만 완료로 친다. 마우스 클릭·키보드(Enter/Space)
 * 는 의도가 분명하므로 누르면 바로 완료 — 데스크톱·접근성·E2E 가 그대로 동작한다.
 */

/** 트랙 폭 대비 이만큼 밀면 완료. */
export const SLIDE_THRESHOLD = 0.6;

export type SlidePointer = "touch" | "pen" | "mouse" | "keyboard";

/** 손잡이 이동 거리(px)를 0~최대 이동폭으로 자른다. 왼쪽으로는 안 간다. */
export function clampSlide(dx: number, maxDx: number): number {
  if (!Number.isFinite(dx) || maxDx <= 0) return 0;
  return Math.min(maxDx, Math.max(0, dx));
}

/** 놓았을 때 완료로 칠지. */
export function slideCompletes(
  pointer: SlidePointer,
  dx: number,
  maxDx: number,
): boolean {
  if (pointer === "mouse" || pointer === "keyboard") return true;
  if (maxDx <= 0) return false;
  return clampSlide(dx, maxDx) / maxDx >= SLIDE_THRESHOLD;
}
