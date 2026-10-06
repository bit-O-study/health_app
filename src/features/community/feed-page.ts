import type { FeedPost } from './data-access';
/** 피드 서버 조회 보기 — 질문·답변 기다리는 질문·저장한 글은 커뮤니티 3단계, 댓글 단 글은 4-1. */
export type FeedView = 'workout' | 'popular' | 'mine' | 'teaching' | 'question' | 'question_open' | 'saved' | 'commented';
export type FeedCursor = { id: string; kind: string; created_at: string; score: number };
export type FeedPage = { posts: FeedPost[]; cursor: FeedCursor | null; asOf: string };
const VIEWS: readonly FeedView[] = ['workout', 'popular', 'mine', 'teaching', 'question', 'question_open', 'saved', 'commented'];
export function feedView(value?: string): FeedView {
  return (VIEWS as readonly string[]).includes(value ?? '') ? (value as FeedView) : 'workout';
}
export function validCursor(cursor: FeedCursor): boolean {
  return /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(cursor.id) && ['photo', 'teaching'].includes(cursor.kind)
    && Number.isFinite(Date.parse(cursor.created_at)) && Number.isSafeInteger(cursor.score) && cursor.score >= 0;
}
