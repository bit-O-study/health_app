/**
 * 부팅 직후 '보던 화면 복원' 여부를 결정하는 순수 로직 — React/next 의존 없음(테스트 공용).
 * 실제 사용/배경은 src/app/_route-keeper.tsx 참고.
 */

export const RESTORE_WINDOW_MS = 30 * 60 * 1000; // 30분 내 이탈이면 이어보기

// 부팅 시 여기로 튕겼을 때만 복원 시도(딥링크로 특정 화면을 연 경우엔 건드리지 않음).
export const HOME_PATHS: ReadonlySet<string> = new Set(["/", "/routine"]);

export type SavedRoute = { path: string; ts: number };

/**
 * 지금(currentPath) 홈으로 튕겼고, 최근(now-저장 < 창) 다른 화면을 보고 있었다면 복원.
 * @param saved 저장된 마지막 경로(없으면 null)
 * @param currentPath 현재 전체 경로(pathname + search)
 * @param now 현재 시각(ms)
 */
export function shouldRestoreRoute(
  saved: SavedRoute | null,
  currentPath: string,
  now: number,
): boolean {
  if (!saved) return false;
  const curPathname = currentPath.split("?")[0];
  const savedPathname = saved.path.split("?")[0];
  if (!HOME_PATHS.has(curPathname)) return false; // 홈으로 튕긴 경우만
  if (HOME_PATHS.has(savedPathname)) return false; // 저장분이 홈이면 복원 의미 없음
  if (saved.path === currentPath) return false; // 이미 그 화면
  if (now - saved.ts >= RESTORE_WINDOW_MS) return false; // 너무 오래됨
  return true;
}