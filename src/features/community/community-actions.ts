"use server";

import { revalidatePath } from "next/cache";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { resolveMemberName } from "@/features/groups/member-name";
import { MAX_CAPTION, validatePostInput } from "./community";
import { resolveVisibility, type Visibility } from "./feed";
import { getPostComments, type CommunityComment } from "./data-access";

type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

/**
 * 오운완 인증 글 작성. 공개범위(visibility) + 기준 그룹(groupId).
 * public=전체공개(그룹불필요), group=그룹만, public_except_group=그 그룹 제외 공개.
 */
export async function createCommunityPostAction(input: {
  photoUrl: string;
  caption: string;
  groupId: string | null;
  visibility?: Visibility;
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const check = validatePostInput({
    photoUrl: input.photoUrl,
    caption: input.caption,
  });
  if (!check.ok) return check;

  const vis = resolveVisibility(input.visibility, input.groupId);
  if (!vis.ok) return vis;

  const supabase = await createSupabaseServerClient();

  // 작성자 표시 이름 스냅샷(닉네임 → 이름 → "회원").
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
    .from("community_posts")
    .insert({
      user_id: user.id,
      group_id: vis.groupId,
      visibility: vis.visibility,
      author_name: authorName,
      photo_url: input.photoUrl.trim(),
      caption: caption.length > 0 ? caption : null,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/community");
  return { ok: true, id: (data as { id: string }).id };
}

/** 인증 글 삭제 — 본인 또는 게시물 관리자(모더레이터). 권한은 RLS가 강제. */
export async function deleteCommunityPostAction(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  if (!id) return { ok: false, error: "잘못된 요청입니다." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("community_posts").delete().eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/community");
  return { ok: true };
}

/** 인증 글 한마디 수정 — 본인 또는 게시물 관리자. 권한은 RLS가 강제. */
export async function editCommunityPostAction(
  id: string,
  caption: string,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  if (!id) return { ok: false, error: "잘못된 요청입니다." };
  const text = (caption ?? "").trim();
  if (text.length > MAX_CAPTION)
    return { ok: false, error: `한마디는 ${MAX_CAPTION}자까지 쓸 수 있어요.` };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("community_posts")
    .update({ caption: text.length > 0 ? text : null })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/community");
  return { ok: true };
}

/** 좋아요 토글 — 없으면 추가, 있으면 취소. */
export async function toggleLikeAction(
  postId: string,
): Promise<{ ok: true; liked: boolean } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  if (!postId) return { ok: false, error: "잘못된 요청입니다." };

  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase
    .from("community_likes")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("community_likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", user.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/community");
    return { ok: true, liked: false };
  }

  const { error } = await supabase
    .from("community_likes")
    .insert({ post_id: postId, user_id: user.id });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/community");
  return { ok: true, liked: true };
}

/** 댓글 작성. */
export async function addCommentAction(
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

  const { error } = await supabase.from("community_comments").insert({
    post_id: postId,
    user_id: user.id,
    author_name: authorName,
    body: text,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/community");
  return { ok: true };
}

/** 한 글의 댓글 목록(모달용). */
export async function listCommentsAction(
  postId: string,
): Promise<CommunityComment[]> {
  return getPostComments(postId);
}

/** 내 댓글 삭제(RLS로 본인만). */
export async function deleteCommentAction(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  if (!id) return { ok: false, error: "잘못된 요청입니다." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("community_comments")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/community");
  return { ok: true };
}
