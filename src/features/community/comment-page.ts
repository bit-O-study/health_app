/**
 * 댓글 한 페이지 자르기 — 순수 로직(커뮤니티 2단계, 2026-09-30).
 *
 * 서버는 최신 것부터 limit+1 개를 읽는다. +1 이 있으면 '이전 댓글이 더 있다'.
 * 화면은 대화처럼 오래된 → 최신 순이라 뒤집어서 돌려준다.
 * 예전엔 댓글을 한 번에 전부 읽었다(댓글 많은 글일수록 느려짐).
 */
export function pageComments<T>(rowsNewestFirst: readonly T[], limit: number): { comments: T[]; hasMore: boolean } {
  const hasMore = rowsNewestFirst.length > limit;
  const page = rowsNewestFirst.slice(0, limit);
  return { comments: [...page].reverse(), hasMore };
}
