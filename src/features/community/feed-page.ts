import type { FeedPost } from './data-access';
export type FeedView = 'workout' | 'popular' | 'mine' | 'teaching';
export type FeedCursor = { id: string; kind: string; created_at: string; score: number };
export type FeedPage = { posts: FeedPost[]; cursor: FeedCursor | null; asOf: string };
export function feedView(value?: string): FeedView {
  return value === 'popular' || value === 'mine' || value === 'teaching' ? value : 'workout';
}
export function validCursor(cursor: FeedCursor): boolean {
  return /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(cursor.id) && ['photo', 'teaching'].includes(cursor.kind)
    && Number.isFinite(Date.parse(cursor.created_at)) && Number.isSafeInteger(cursor.score) && cursor.score >= 0;
}
