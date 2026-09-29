import 'server-only';
import { createSupabaseServerClient, getCurrentUser } from '@/lib/supabase/server';
import { getUnifiedFeed } from './data-access';
import { feedView, validCursor, type FeedCursor, type FeedPage } from './feed-page';

export async function getFeedPage(view: string, search = '', cursor: FeedCursor | null = null, asOf = new Date().toISOString()): Promise<FeedPage> {
  if (!await getCurrentUser()) throw new Error('로그인이 필요합니다.');
  if (!Number.isFinite(Date.parse(asOf)) || (cursor && !validCursor(cursor))) throw new Error('잘못된 조회 요청입니다.');
  const db = await createSupabaseServerClient();
  const { data, error } = await db.rpc('community_feed_page', {
    p_view: feedView(view), p_search: search.trim().slice(0, 100), p_as_of: asOf,
    p_before: cursor?.created_at ?? null, p_id: cursor?.id ?? null,
    p_kind: cursor?.kind ?? '', p_score: cursor?.score ?? null,
  });
  if (error) throw new Error('게시물을 불러오지 못했어요. 다시 시도해주세요.');
  const rows = (data ?? []) as FeedCursor[];
  const selected = rows.slice(0, 20);
  const posts = selected.length ? await getUnifiedFeed(20, selected) : [];
  const byId = new Map(posts.map(p => [`${p.kind}:${p.id}`, p]));
  return { posts: selected.flatMap(r => { const p = byId.get(`${r.kind}:${r.id}`); return p ? [p] : []; }),
    cursor: rows.length > 20 ? selected.at(-1)! : null, asOf };
}
