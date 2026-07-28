import "server-only";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import {
  mergeByCreatedAt,
  type FeedKind,
  type Visibility,
} from "@/features/community/feed";
import { resolveMemberName } from "@/features/groups/member-name";

/** 통합 피드 글(사진 인증 + 운동 티칭 영상). */
export type FeedPost = {
  id: string;
  kind: FeedKind;
  userId: string;
  authorName: string;
  groupId: string | null;
  groupName: string | null;
  visibility: Visibility;
  caption: string | null;
  createdAt: string;
  isMine: boolean;
  // photo 전용
  photoUrl: string | null;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  // teaching 전용
  videoUrl: string | null;
  exerciseTag: string | null;
  exerciseSlug: string | null;
};

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
  /** 댓글 작성자 — 신고 시 '작성자 정지'에 필요하다(없으면 정지를 못 건다). */
  userId: string;
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

type TeachingRow = {
  id: string;
  user_id: string;
  group_id: string | null;
  visibility: string | null;
  author_name: string | null;
  exercise_slug: string | null;
  exercise_tag: string;
  video_url: string;
  caption: string | null;
  created_at: string;
};

const asVisibility = (v: string | null, groupId: string | null): Visibility => {
  if (v === "group" || v === "public" || v === "public_except_group") return v;
  return groupId ? "group" : "public";
};

/**
 * 통합 피드 — 사진 인증(community_posts) + 운동 티칭 영상(teaching_posts)을
 * 한 번에 가져와 작성시각순으로 병합. 가시성은 RLS가 강제(공개범위별).
 */
export async function getUnifiedFeed(limit = 120): Promise<FeedPost[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createSupabaseServerClient();

  const [{ data: cData }, { data: tData }, { data: myProf }] = await Promise.all([
    supabase
      .from("community_posts")
      .select("id, user_id, group_id, visibility, author_name, photo_url, caption, created_at")
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("teaching_posts")
      .select("id, user_id, group_id, visibility, author_name, exercise_slug, exercise_tag, video_url, caption, created_at")
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("profiles")
      .select("name, nickname")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  // 내 글은 저장 당시 스냅샷된 author_name 대신 '현재' 닉네임으로 보여준다
  // (닉네임 바꾸면 옛 글이 옛 이름으로 남던 문제).
  const myName = resolveMemberName(
    (myProf as { nickname?: string | null } | null)?.nickname,
    (myProf as { name?: string | null } | null)?.name,
    null,
  );
  const displayName = (uid: string, snapshot: string | null): string =>
    uid === user.id ? myName : (snapshot?.trim() || "회원");

  const cRows = (cData ?? []) as (Row & { visibility: string | null })[];
  const tRows = (tData ?? []) as TeachingRow[];
  if (cRows.length === 0 && tRows.length === 0) return [];

  // 그룹 이름 + 사진글 카운트/내 좋아요.
  const groupIds = [
    ...new Set(
      [...cRows, ...tRows]
        .map((r) => r.group_id)
        .filter((v): v is string => !!v),
    ),
  ];
  const photoIds = cRows.map((r) => r.id);
  const teachIds = tRows.map((r) => r.id);

  const [{ data: grps }, { data: counts }, { data: myLikes }, { data: tCounts }] =
    await Promise.all([
      groupIds.length > 0
        ? supabase.from("groups").select("id, name").in("id", groupIds)
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      photoIds.length > 0
        ? supabase.rpc("community_post_counts", { pids: photoIds })
        : Promise.resolve({ data: [] as { post_id: string; like_count: number; comment_count: number }[] }),
      photoIds.length > 0
        ? supabase.from("community_likes").select("post_id").eq("user_id", user.id).in("post_id", photoIds)
        : Promise.resolve({ data: [] as { post_id: string }[] }),
      teachIds.length > 0
        ? supabase.rpc("teaching_post_counts", { pids: teachIds })
        : Promise.resolve({
            data: [] as {
              post_id: string;
              like_count: number;
              comment_count: number;
              liked_by_me: boolean;
            }[],
          }),
    ]);

  const groupNameById = new Map<string, string>();
  for (const g of (grps ?? []) as { id: string; name: string }[]) groupNameById.set(g.id, g.name);
  const likeCount = new Map<string, number>();
  const commentCount = new Map<string, number>();
  for (const r of (counts ?? []) as { post_id: string; like_count: number; comment_count: number }[]) {
    likeCount.set(r.post_id, r.like_count);
    commentCount.set(r.post_id, r.comment_count);
  }
  const likedByMe = new Set<string>(((myLikes ?? []) as { post_id: string }[]).map((l) => l.post_id));

  // 티칭 글 좋아요/댓글 수 + 내 좋아요 여부(teaching_post_counts RPC).
  const tLike = new Map<string, number>();
  const tComment = new Map<string, number>();
  const tLikedByMe = new Set<string>();
  for (const r of (tCounts ?? []) as {
    post_id: string;
    like_count: number;
    comment_count: number;
    liked_by_me: boolean;
  }[]) {
    tLike.set(r.post_id, r.like_count);
    tComment.set(r.post_id, r.comment_count);
    if (r.liked_by_me) tLikedByMe.add(r.post_id);
  }

  const gName = (id: string | null) => (id ? (groupNameById.get(id) ?? null) : null);

  const photos: FeedPost[] = cRows.map((r) => ({
    id: r.id,
    kind: "photo",
    userId: r.user_id,
    authorName: displayName(r.user_id, r.author_name),
    groupId: r.group_id,
    groupName: gName(r.group_id),
    visibility: asVisibility(r.visibility, r.group_id),
    caption: r.caption,
    createdAt: r.created_at,
    isMine: r.user_id === user.id,
    photoUrl: r.photo_url,
    likeCount: likeCount.get(r.id) ?? 0,
    commentCount: commentCount.get(r.id) ?? 0,
    likedByMe: likedByMe.has(r.id),
    videoUrl: null,
    exerciseTag: null,
    exerciseSlug: null,
  }));

  const teachings: FeedPost[] = tRows.map((r) => ({
    id: r.id,
    kind: "teaching",
    userId: r.user_id,
    authorName: displayName(r.user_id, r.author_name),
    groupId: r.group_id,
    groupName: gName(r.group_id),
    visibility: asVisibility(r.visibility, r.group_id),
    caption: r.caption,
    createdAt: r.created_at,
    isMine: r.user_id === user.id,
    photoUrl: null,
    likeCount: tLike.get(r.id) ?? 0,
    commentCount: tComment.get(r.id) ?? 0,
    likedByMe: tLikedByMe.has(r.id),
    videoUrl: r.video_url,
    exerciseTag: r.exercise_tag,
    exerciseSlug: r.exercise_slug,
  }));

  return mergeByCreatedAt(photos, teachings).slice(0, limit);
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
    userId: c.user_id,
    authorName: c.author_name?.trim() || "회원",
    body: c.body,
    createdAt: c.created_at,
    isMine: c.user_id === user.id,
  }));
}
