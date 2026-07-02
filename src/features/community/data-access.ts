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

  // 카운트는 RPC로 집계(좋아요/댓글 행 전체를 가져오지 않음), 좋아요 여부는 내 것만 조회.
  const [{ data: grps }, { data: counts }, { data: myLikes }] =
    await Promise.all([
      groupIds.length > 0
        ? supabase.from("groups").select("id, name").in("id", groupIds)
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      supabase.rpc("community_post_counts", { pids: postIds }),
      supabase
        .from("community_likes")
        .select("post_id")
        .eq("user_id", user.id)
        .in("post_id", postIds),
    ]);

  const groupNameById = new Map<string, string>();
  for (const g of (grps ?? []) as { id: string; name: string }[]) {
    groupNameById.set(g.id, g.name);
  }

  const likeCount = new Map<string, number>();
  const commentCount = new Map<string, number>();
  for (const r of (counts ?? []) as {
    post_id: string;
    like_count: number;
    comment_count: number;
  }[]) {
    likeCount.set(r.post_id, r.like_count);
    commentCount.set(r.post_id, r.comment_count);
  }
  const likedByMe = new Set<string>(
    ((myLikes ?? []) as { post_id: string }[]).map((l) => l.post_id),
  );

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

/** 상세페이지용 — 글 하나(가시성 RLS). 좋아요/댓글 수 포함. 안 보이면 null. */
export async function getCommunityPostDetail(
  id: string,
): Promise<CommunityPost | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("community_posts")
    .select("id, user_id, group_id, author_name, photo_url, caption, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const r = data as Row;

  let groupName: string | null = null;
  if (r.group_id) {
    const { data: g } = await supabase
      .from("groups")
      .select("name")
      .eq("id", r.group_id)
      .maybeSingle();
    groupName = (g as { name: string } | null)?.name ?? null;
  }

  const [{ data: likes }, { count: commentCount }] = await Promise.all([
    supabase.from("community_likes").select("user_id").eq("post_id", id),
    supabase
      .from("community_comments")
      .select("id", { count: "exact", head: true })
      .eq("post_id", id),
  ]);
  const likeRows = (likes ?? []) as { user_id: string }[];

  return {
    id: r.id,
    userId: r.user_id,
    authorName: r.author_name?.trim() || "회원",
    groupId: r.group_id,
    groupName,
    photoUrl: r.photo_url,
    caption: r.caption,
    createdAt: r.created_at,
    isMine: r.user_id === user.id,
    likeCount: likeRows.length,
    commentCount: commentCount ?? 0,
    likedByMe: likeRows.some((l) => l.user_id === user.id),
  };
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
