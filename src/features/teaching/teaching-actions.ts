"use server";

import { revalidatePath } from "next/cache";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { resolveMemberName } from "@/features/groups/member-name";
import { resolveVisibility, type Visibility } from "@/features/community/feed";
import { normalizeTag, validateTeachingPost } from "./teaching";

type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

/**
 * 운동 티칭 영상 글 작성. 커뮤니티 통합 피드에 뜬다.
 * 공개범위(visibility) + 기준 그룹(groupId) 은 사진 인증 글과 동일 규칙.
 */
export async function createTeachingPostAction(input: {
  videoUrl: string;
  exerciseTag: string;
  exerciseSlug?: string | null;
  caption: string;
  groupId?: string | null;
  visibility?: Visibility;
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const check = validateTeachingPost({
    videoUrl: input.videoUrl,
    exerciseTag: input.exerciseTag,
    caption: input.caption,
  });
  if (!check.ok) return check;

  const vis = resolveVisibility(input.visibility, input.groupId ?? null);
  if (!vis.ok) return vis;

  const supabase = await createSupabaseServerClient();

  const { data: prof } = await supabase
    .from("profiles")
    .select("name, nickname")
    .eq("user_id", user.id)
    .maybeSingle();
  const authorName = resolveMemberName(
    (prof as { nickname?: string | null } | null)?.nickname,
    (prof as { name?: string | null } | null)?.name,
    null,
  );

  const caption = input.caption.trim();
  const { data, error } = await supabase
    .from("teaching_posts")
    .insert({
      user_id: user.id,
      group_id: vis.groupId,
      visibility: vis.visibility,
      author_name: authorName,
      exercise_slug: input.exerciseSlug?.trim() || null,
      exercise_tag: normalizeTag(input.exerciseTag),
      video_url: input.videoUrl.trim(),
      caption: caption.length > 0 ? caption : null,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/community");
  return { ok: true, id: (data as { id: string }).id };
}

/** 티칭 글 삭제 — 본인 또는 게시물 관리자(모더레이터). 권한은 RLS가 강제. */
export async function deleteTeachingPostAction(
  id: string,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  if (!id) return { ok: false, error: "잘못된 요청입니다." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("teaching_posts").delete().eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/community");
  return { ok: true };
}

/** 티칭 영상 좋아요 토글(teaching_likes — community_* 와 별개 테이블). */
export async function toggleTeachingLikeAction(
  postId: string,
): Promise<{ ok: true; liked: boolean } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  if (!postId) return { ok: false, error: "잘못된 요청입니다." };

  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase
    .from("teaching_likes")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("teaching_likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", user.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/community");
    return { ok: true, liked: false };
  }

  const { error } = await supabase
    .from("teaching_likes")
    .insert({ post_id: postId, user_id: user.id });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/community");
  return { ok: true, liked: true };
}

export type TeachingComment = {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
  isMine: boolean;
};

/** 티칭 영상 댓글 목록. */
export async function listTeachingCommentsAction(
  postId: string,
): Promise<TeachingComment[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("teaching_comments")
    .select("id, user_id, author_name, body, created_at")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  return (
    (data ?? []) as {
      id: string;
      user_id: string;
      author_name: string | null;
      body: string;
      created_at: string;
    }[]
  ).map((c) => ({
    id: c.id,
    authorName: c.author_name?.trim() || "회원",
    body: c.body,
    createdAt: c.created_at,
    isMine: c.user_id === user.id,
  }));
}

/** 티칭 영상 댓글 작성. */
export async function addTeachingCommentAction(
  postId: string,
  body: string,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  const text = (body ?? "").trim();
  if (!postId || !text) return { ok: false, error: "댓글을 입력해주세요." };
  if (text.length > 300)
    return { ok: false, error: "댓글은 300자까지 쓸 수 있어요." };

  const supabase = await createSupabaseServerClient();
  const { data: prof } = await supabase
    .from("profiles")
    .select("name, nickname")
    .eq("user_id", user.id)
    .maybeSingle();
  const authorName = resolveMemberName(
    (prof as { nickname?: string | null } | null)?.nickname,
    (prof as { name?: string | null } | null)?.name,
    null,
  );

  const { error } = await supabase.from("teaching_comments").insert({
    post_id: postId,
    user_id: user.id,
    author_name: authorName,
    body: text,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/community");
  return { ok: true };
}

/** 티칭 영상 댓글 삭제(본인/모더레이터). */
export async function deleteTeachingCommentAction(
  id: string,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  if (!id) return { ok: false, error: "잘못된 요청입니다." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("teaching_comments")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/community");
  return { ok: true };
}