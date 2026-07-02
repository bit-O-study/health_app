import "server-only";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";

export type CommunityPost = {
  id: string;
  userId: string;
  authorName: string;
  groupId: string | null;
  groupName: string | null;
  photoUrl: string;
  caption: string | null;
  createdAt: string; // ISO
  isMine: boolean;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
};

export type CommunityComment = {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
  isMine: boolean;
};

type Row = {
  id: string;
  user_id: string;
  group_id: string | null;
  author_name: string | null;
  photo_url: string;
  caption: string | null;
  created_at: string;
};

/**
 * 내가 볼 수 있는 오운완 인증 글(공개글 + 내가 속한 그룹의 글). RLS가 가시성 필터.
 * 그룹별 탭에서 쓸 그룹 이름 태그를 함께 채운다.
 */
export async function getCommunityFeed(limit = 100): Promise<CommunityPost[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("community_posts")
    .select("id, user_id, group_id, author_name, photo_url, caption, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  const rows = (data ?? []) as Row[];
  if (rows.length === 0) return [];

  const postIds = rows.map((r) => r.id);
  const groupIds = [
    ...new Set(rows.map((r) => r.group_id).filter((v): v is string => !!v)),
  ];

  const [{ data: grps }, { data: likes }, { data: comments }] =
    await Promise.all([
      groupIds.length > 0
        ? supabase.from("groups").select("id, name").in("id", groupIds)
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      supabase
        .from("community_likes")
        .select("post_id, user_id")
        .in("post_id", postIds),
      supabase
        .from("community_comments")
        .select("post_id")
        .in("post_id", postIds),
    ]);

  const groupNameById = new Map<string, string>();
  for (const g of (grps ?? []) as { id: string; name: string }[]) {
    groupNameById.set(g.id, g.name);
  }

  const likeCount = new Map<string, number>();
  const likedByMe = new Set<string>();
  for (const l of (likes ?? []) as { post_id: string; user_id: string }[]) {
    likeCount.set(l.post_id, (likeCount.get(l.post_id) ?? 0) + 1);
    if (l.user_id === user.id) likedByMe.add(l.post_id);
  }
  const commentCount = new Map<string, number>();
  for (const cm of (comments ?? []) as { post_id: string }[]) {
    commentCount.set(cm.post_id, (commentCount.get(cm.post_id) ?? 0) + 1);
  }

  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    authorName: r.author_name?.trim() || "회원",
    groupId: r.group_id,
    groupName: r.group_id ? (groupNameById.get(r.group_id) ?? null) : null,
    photoUrl: r.photo_url,
    caption: r.caption,
    createdAt: r.created_at,
    isMine: r.user_id === user.id,
    likeCount: likeCount.get(r.id) ?? 0,
    commentCount: commentCount.get(r.id) ?? 0,
    likedByMe: likedByMe.has(r.id),
  }));
}

/** 한 글의 댓글 목록(오래된 순). */
export async function getPostComments(
  postId: string,
): Promise<CommunityComment[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("community_comments")
    .select("id, user_id, author_name, body, created_at")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  return ((data ?? []) as {
    id: string;
    user_id: string;
    author_name: string | null;
    body: string;
    created_at: string;
  }[]).map((c) => ({
    id: c.id,
    authorName: c.author_name?.trim() || "회원",
    body: c.body,
    createdAt: c.created_at,
    isMine: c.user_id === user.id,
  }));
}
