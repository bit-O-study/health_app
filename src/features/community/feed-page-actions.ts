'use server';
import { getFeedPage } from './feed-page.server';
import type { FeedCursor } from './feed-page';
export async function loadFeedPage(view: string, search: string, cursor: FeedCursor | null, asOf: string) {
  try { return { ok: true as const, page: await getFeedPage(view, search, cursor, asOf) }; }
  catch { return { ok: false as const, error: '게시물을 불러오지 못했어요. 다시 시도해주세요.' }; }
}
