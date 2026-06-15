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
