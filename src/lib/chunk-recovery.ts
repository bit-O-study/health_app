/**
 * 청크/동적 import 로드 실패 여부 판별(순수 — 테스트 가능).
 *
 * 설치형 PWA 가 옛 빌드 세션을 백그라운드에 물고 있다가, 새 배포로 사라진 청크를
 * 불러오면 이런 에러가 난다("this page couldn't load"). 이걸 잡아 1회 새로고침으로
 * 최신 빌드를 받게 한다(자가복구). 여러 브라우저/번들러의 메시지 표현을 함께 매칭한다.
 */
const CHUNK_ERROR_RE =
  /Loading chunk|ChunkLoadError|loading dynamically imported module|Importing a module script failed|Failed to fetch dynamically imported module|Loading CSS chunk/i;

export function isChunkLoadError(message: string | null | undefined): boolean {
  if (!message) return false;
  return CHUNK_ERROR_RE.test(message);
}

const NETWORK_LOAD_ERROR_RE =
  /Failed to fetch|NetworkError|Load failed|net::ERR_(?:INTERNET_DISCONNECTED|NETWORK_CHANGED|CONNECTION_(?:ABORTED|CLOSED|RESET|REFUSED|TIMED_OUT))/i;

export function isRecoverableLoadError(
  message: string | null | undefined,
): boolean {
  if (!message) return false;
  return isChunkLoadError(message) || NETWORK_LOAD_ERROR_RE.test(message);
}

export type AppErrorDiagnostic = {
  occurredAt: number;
  path: string;
  message: string;
  digest: string | null;
  recoverable: boolean;
};

type AppErrorLike = { message?: string; digest?: string };
type DiagnosticStorage = { setItem: (key: string, value: string) => void };

export const LAST_APP_ERROR_KEY = "heltch.lastAppError";

export function createAppErrorDiagnostic(
  error: AppErrorLike,
  path: string,
  occurredAt: number,
): AppErrorDiagnostic {
  const message = String(error?.message || "Unknown error").slice(0, 500);
  return {
    occurredAt,
    path: path.slice(0, 500),
    message,
    digest:
      typeof error?.digest === "string" ? error.digest.slice(0, 120) : null,
    recoverable: isRecoverableLoadError(message),
  };
}

export function recordAppErrorDiagnostic(
  error: AppErrorLike,
  path: string,
  occurredAt: number,
  storage?: DiagnosticStorage,
): AppErrorDiagnostic {
  const diagnostic = createAppErrorDiagnostic(error, path, occurredAt);
  try {
    const target =
      storage ??
      (typeof window !== "undefined" ? window.localStorage : undefined);
    target?.setItem(LAST_APP_ERROR_KEY, JSON.stringify(diagnostic));
  } catch {
    /* diagnostics must never break error recovery */
  }
  return diagnostic;
}

/**
 * 자동 새로고침 루프 방지 판정(순수 — 테스트 가능).
 *
 * 에러 바운더리가 뜰 때(예: 다른 앱 갔다 복귀 → 옛 청크/RSC 로드 실패) 조용히
 * 새로고침으로 자가복구하되, 방금 새로고침했는데 또 에러가 나면(진짜 고장) 무한
 * 리로드하지 않도록 windowMs 내 1회로 제한한다.
 *
 * @param lastReloadAt 마지막 자동 리로드 시각(ms). 없으면 0/NaN.
 * @param now 현재 시각(ms).
 * @returns 지금 자동 리로드해도 되는지.
 */
export function shouldAutoReload(
  lastReloadAt: number,
  now: number,
  windowMs = 30_000,
): boolean {
  if (!Number.isFinite(lastReloadAt) || lastReloadAt <= 0) return true;
  return now - lastReloadAt >= windowMs;
}

export function shouldRecoverAppError(
  error: AppErrorLike,
  lastReloadAt: number,
  now: number,
): boolean {
  return (
    isRecoverableLoadError(error?.message) &&
    shouldAutoReload(lastReloadAt, now)
  );
}

/** 자동 리로드 시각 저장 키(sessionStorage) — 에러 바운더리·PWA 복구가 공유. */
export const AUTO_RELOAD_KEY = "heltch.autoReloadAt";
