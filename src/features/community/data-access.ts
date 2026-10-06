import "server-only";
import { readWorkoutSnapshot, type WorkoutSnapshot } from "./workout-snapshot";
import type { FeedCursor } from "./feed-page";

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
import { pageComments } from "@/features/community/comment-page";
import { paidMemberIds } from "@/features/billing/member-badges.server";

/** 통합 피드 글(사진 인증 + 운동 티칭 영상). */
export type FeedPost = {
  id: string;
  kind: FeedKind;
  userId: string;
  authorName: string;
  groupId: string | null;
  groupName: string | null;
  visibility: Visibility;
  workoutSnapshot?: WorkoutSnapshot | null;
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
  /** 사진 인증 / 질문 글(커뮤니티 3단계). 티칭 영상은 "photo" 로 둔다. */
  postType: PostType;
  /** 질문 제목. */
  title: string | null;
  /** 질문 해결됨. */
  resolved: boolean;
  /** 내가 저장했나(피드 글만). */
  savedByMe: boolean;
  /** 신고가 쌓여 다른 사람에게 숨겨짐(내 글·관리자에게만 이 상태로 보인다). */
  hidden: boolean;
  /** 글쓴이가 라이트 이상 — 이름 옆 배지(2026-10-02). */
  authorLite?: boolean;
};

export type PostType = "photo" | "question";

export type CommunityPost = {
  id: string;
  userId: string;
  authorName: string;
  groupId: string | null;
  groupName: string | null;
  photoUrl: string | null;
  workoutSnapshot?: WorkoutSnapshot | null;
  caption: string | null;
  createdAt: string; // ISO
  isMine: boolean;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  postType: PostType;
  title: string | null;
  resolved: boolean;
  savedByMe: boolean;
  hidden: boolean;
  /** 질문: 채택한 답변(커뮤니티 4-2). */
  acceptedCommentId: string | null;
  /** 채택한 답변 — 위에 고정해 보여 준다(최신 50개 밖에 있어도). */
  acceptedComment: CommunityComment | null;
  /** 질문: 운동 태그. */
  exerciseTag: string | null;
};

/** 댓글 한 페이지 — 최신 것부터 이만큼(화면은 오래된 순). */
export const COMMENT_PAGE = 50;

export type CommentPage = { comments: CommunityComment[]; hasMore: boolean };

export type CommunityComment = {
  id: string;
  /** 댓글 작성자 — 신고 시 '작성자 정지'에 필요하다(없으면 정지를 못 건다). */
  userId: string;
  authorName: string;
  body: string;
  createdAt: string;
  isMine: boolean;
  /** 답글이면 부모 댓글 id(한 단계 — 커뮤니티 4-2). */
  parentId: string | null;
  /** 공감 수 · 내가 눌렀나(커뮤니티 4-3). */
  likeCount: number;
  likedByMe: boolean;
};

type CommentRow = {
  id: string;
  user_id: string;
  author_name: string | null;
  body: string;
  created_at: string;
  parent_id: string | null;
};
const COMMENT_COLUMNS = "id, user_id, author_name, body, created_at, parent_id";
const toComment = (c: CommentRow, meId: string): CommunityComment => ({
  id: c.id,
  userId: c.user_id,
  authorName: c.author_name?.trim() || "회원",
  body: c.body,
  createdAt: c.created_at,
  isMine: c.user_id === meId,
  parentId: c.parent_id ?? null,
  likeCount: 0,
  likedByMe: false,
});

/** 공감 수 · 내가 눌렀나를 한 번에 채운다(댓글마다 왕복하지 않게). */
async function withCommentLikes(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  list: CommunityComment[],
): Promise<CommunityComment[]> {
  if (list.length === 0) return list;
  const { data } = await supabase.rpc("comment_like_counts", { cids: list.map((c) => c.id) });
  const byId = new Map(
    ((data ?? []) as { comment_id: string; like_count: number; liked_by_me: boolean }[]).map((r) => [r.comment_id, r]),
  );
  return list.map((c) => {
    const r = byId.get(c.id);
    return r ? { ...c, likeCount: r.like_count, likedByMe: r.liked_by_me } : c;
  });
}

type Row = {
  id: string;
  user_id: string;
  group_id: string | null;
  author_name: string | null;
  photo_url: string | null;
  workout_snapshot?: unknown;
  caption: string | null;
  created_at: string;
  post_type?: string | null;
  title?: string | null;
  resolved_at?: string | null;
  hidden_at?: string | null;
  accepted_comment_id?: string | null;
  exercise_tag?: string | null;
};

const asPostType = (v: string | null | undefined): PostType => (v === "question" ? "question" : "photo");

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
  hidden_at?: string | null;
};

const asVisibility = (v: string | null, groupId: string | null): Visibility => {
  if (v === "group" || v === "public" || v === "public_except_group") return v;
  return groupId ? "group" : "public";
};

/**
 * 통합 피드 — 사진 인증(community_posts) + 운동 티칭 영상(teaching_posts)을
 * 한 번에 가져와 작성시각순으로 병합. 가시성은 RLS가 강제(공개범위별).
 */
export async function getUnifiedFeed(limit = 120, selection?: FeedCursor[]): Promise<FeedPost[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createSupabaseServerClient();

  let photosQuery = supabase.from("community_posts").select("id, user_id, group_id, visibility, author_name, photo_url, workout_snapshot, caption, created_at, post_type, title, resolved_at, hidden_at, exercise_tag").order("created_at", { ascending: false }).limit(limit);
  let teachingQuery = supabase.from("teaching_posts").select("id, user_id, group_id, visibility, author_name, exercise_slug, exercise_tag, video_url, caption, created_at, hidden_at").order("created_at", { ascending: false }).limit(limit);
  if (selection) {
    photosQuery = photosQuery.in("id", selection.filter(r => r.kind === "photo").map(r => r.id));
    teachingQuery = teachingQuery.in("id", selection.filter(r => r.kind === "teaching").map(r => r.id));
  }
  const [{ data: cData, error: cError }, { data: tData, error: tError }, { data: myProf }] = await Promise.all([
    photosQuery, teachingQuery,
    supabase.from("profiles").select("name, nickname").eq("user_id", user.id).maybeSingle(),
  ]);
  if (cError || tError) throw new Error("게시물을 불러오지 못했어요.");

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

  const [{ data: grps }, { data: counts }, { data: myLikes }, { data: tCounts }, { data: mySaves }, { data: myTSaves }, paid] =
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
      photoIds.length > 0
        ? supabase.from("community_saves").select("post_id").eq("user_id", user.id).in("post_id", photoIds)
        : Promise.resolve({ data: [] as { post_id: string }[] }),
      teachIds.length > 0
        ? supabase.from("teaching_saves").select("post_id").eq("user_id", user.id).in("post_id", teachIds)
        : Promise.resolve({ data: [] as { post_id: string }[] }),
      // 이름 옆 라이트 배지(2026-10-02) — 글쓴이가 라이트 이상인가만.
      paidMemberIds([...cRows, ...tRows].map((r) => r.user_id)),
    ]);
  const tSavedByMe = new Set<string>(((myTSaves ?? []) as { post_id: string }[]).map((s) => s.post_id));
  const savedByMe = new Set<string>(((mySaves ?? []) as { post_id: string }[]).map((s) => s.post_id));

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
    workoutSnapshot: readWorkoutSnapshot(r.workout_snapshot),
    likeCount: likeCount.get(r.id) ?? 0,
    commentCount: commentCount.get(r.id) ?? 0,
    likedByMe: likedByMe.has(r.id),
    videoUrl: null,
    // 질문의 운동 태그(커뮤니티 4-2). 사진 글은 없음.
    exerciseTag: r.exercise_tag ?? null,
    exerciseSlug: null,
    postType: asPostType(r.post_type),
    title: r.title ?? null,
    resolved: !!r.resolved_at,
    savedByMe: savedByMe.has(r.id),
    hidden: !!r.hidden_at,
    authorLite: paid.has(r.user_id),
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
    postType: "photo",
    title: null,
    resolved: false,
    savedByMe: tSavedByMe.has(r.id),
    hidden: !!r.hidden_at,
    authorLite: paid.has(r.user_id),
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
    .select("id, user_id, group_id, author_name, photo_url, workout_snapshot, caption, created_at, post_type, title, resolved_at, hidden_at, accepted_comment_id, exercise_tag")
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

  // ⚡ 좋아요는 **개수만** — 예전엔 개수를 세려고 좋아요 행을 전부 읽었다(인기 글일수록 느려짐).
  //   피드와 같은 집계 RPC + '내가 눌렀나' 한 행.
  const isMine = r.user_id === user.id;
  const [{ data: counts }, { data: myLike }, { data: myProf }, { data: mySave }, { data: accepted }] = await Promise.all([
    supabase.rpc("community_post_counts", { pids: [id] }),
    supabase.from("community_likes").select("post_id").eq("post_id", id).eq("user_id", user.id).maybeSingle(),
    isMine
      ? supabase.from("profiles").select("name, nickname").eq("user_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("community_saves").select("post_id").eq("post_id", id).eq("user_id", user.id).maybeSingle(),
    r.accepted_comment_id
      ? supabase.from("community_comments").select(COMMENT_COLUMNS).eq("id", r.accepted_comment_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const count = ((counts ?? []) as { like_count: number; comment_count: number }[])[0];

  return {
    id: r.id,
    userId: r.user_id,
    // 내 글은 피드처럼 '지금' 닉네임(피드와 상세의 이름이 다르던 문제).
    authorName: isMine
      ? resolveMemberName(
          (myProf as { nickname?: string | null } | null)?.nickname,
          (myProf as { name?: string | null } | null)?.name,
          null,
        )
      : r.author_name?.trim() || "회원",
    groupId: r.group_id,
    groupName,
    photoUrl: r.photo_url,
    workoutSnapshot: readWorkoutSnapshot(r.workout_snapshot),
    caption: r.caption,
    createdAt: r.created_at,
    isMine,
    likeCount: count?.like_count ?? 0,
    commentCount: count?.comment_count ?? 0,
    likedByMe: !!myLike,
    postType: asPostType(r.post_type),
    title: r.title ?? null,
    resolved: !!r.resolved_at,
    savedByMe: !!mySave,
    hidden: !!r.hidden_at,
    acceptedCommentId: r.accepted_comment_id ?? null,
    // 차단 등으로 못 읽으면 null — 고정 답변 없이 목록만.
    acceptedComment: accepted ? toComment(accepted as CommentRow, user.id) : null,
    exerciseTag: r.exercise_tag ?? null,
  };
}

/** 한 글의 댓글 목록(오래된 순). */
export async function getPostComments(
  postId: string,
  /** 이 시각보다 오래된 댓글부터(‘이전 댓글 더 보기’). 없으면 최신 한 페이지. */
  before?: string | null,
): Promise<CommentPage> {
  const user = await getCurrentUser();
  if (!user) return { comments: [], hasMore: false };
  const supabase = await createSupabaseServerClient();
  // 최신 것부터 한 페이지(+1 로 더 있는지 판단) → 화면은 오래된 순으로.
  let q = supabase
    .from("community_comments")
    .select(COMMENT_COLUMNS)
    .eq("post_id", postId)
    .order("created_at", { ascending: false })
    .limit(COMMENT_PAGE + 1);
  if (before) q = q.lt("created_at", before);
  const { data } = await q;
  const rows = ((data ?? []) as CommentRow[]).map((c) => toComment(c, user.id));
  const page = pageComments(rows, COMMENT_PAGE);
  return { ...page, comments: await withCommentLikes(supabase, page.comments) };
}

const UUID_RE = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

/** 운동 영상 한 편(공유 링크 화면). 볼 수 없으면(범위·숨김·차단·삭제) null. */
export async function getTeachingPost(id: string): Promise<FeedPost | null> {
  if (!UUID_RE.test(id)) return null;
  const posts = await getUnifiedFeed(1, [{ id, kind: "teaching", created_at: "", score: 0 }]);
  return posts[0] ?? null;
}

export type BlockedUser = { userId: string; name: string; blockedAt: string };

/** 내가 차단한 사람들(최근 순). */
export async function getMyBlockedUsers(): Promise<BlockedUser[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("user_blocks")
    .select("blocked_id, blocked_name, created_at")
    .eq("blocker_id", user.id)
    .order("created_at", { ascending: false });
  return ((data ?? []) as { blocked_id: string; blocked_name: string | null; created_at: string }[]).map((r) => ({
    userId: r.blocked_id,
    name: r.blocked_name?.trim() || "회원",
    blockedAt: r.created_at,
  }));
}

export type AuthorProfile = {
  userId: string;
  monthPosts: number;
  acceptedAnswers: number;
  posts: FeedPost[];
};

/** 작성자 프로필 시트(커뮤니티 4-2) — 그 사람 글 중 내가 볼 수 있는 것만(DB 가 거름), 최근 30개. */
export async function getAuthorProfile(authorId: string): Promise<AuthorProfile | null> {
  if (!UUID_RE.test(authorId)) return null;
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createSupabaseServerClient();
  const [{ data: ids }, { data: stats }] = await Promise.all([
    supabase.rpc("community_author_posts", { p_author: authorId, p_limit: 30 }),
    supabase.rpc("community_author_stats", { p_author: authorId }),
  ]);
  const selection = (ids ?? []) as FeedCursor[];
  const posts = selection.length ? await getUnifiedFeed(30, selection) : [];
  const byKey = new Map(posts.map((p) => [`${p.kind}:${p.id}`, p]));
  const s = ((stats ?? []) as { month_posts: number | string; accepted_answers: number | string }[])[0];
  return {
    userId: authorId,
    monthPosts: Number(s?.month_posts ?? 0),
    acceptedAnswers: Number(s?.accepted_answers ?? 0),
    posts: selection.flatMap((r) => byKey.get(`${r.kind}:${r.id}`) ?? []),
  };
}

/** 질문 태그 칩 — 최근 90일 내가 볼 수 있는 질문에서 많이 쓴 태그. */
export async function getQuestionTags(limit = 8): Promise<string[]> {
  if (!(await getCurrentUser())) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("community_question_tags", { p_limit: limit });
  return ((data ?? []) as { tag: string }[]).map((t) => t.tag);
}
