"use server";

import { getShareableWorkout } from "./workout-share-actions";
import { revalidatePath } from "next/cache";
import { after } from "next/server";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolveMemberName } from "@/features/groups/member-name";
import {
  MAX_CAPTION,
  POST_RATE_LIMIT,
  POST_RATE_WINDOW_MS,
  captionLimit,
  communityPhotoPath,
  validatePostInput,
  validateQuestionInput,
} from "./community";
import { pushCommentNotification } from "./community-notify.server";
import { resolveVisibility, type Visibility } from "./feed";
import { getPostComments, type CommentPage } from "./data-access";

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
  workoutDate?: string;
  submissionId?: string;
  /** 질문 글(커뮤니티 3단계) — 제목 + 본문(caption), 사진은 선택, 운동 기록 카드는 없음. */
  postType?: "photo" | "question";
  title?: string;
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  if (input.submissionId && !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(input.submissionId)) return { ok: false, error: "잘못된 요청입니다." };
  const supabase = await createSupabaseServerClient();
  if (input.submissionId) {
    const { data: existing } = await supabase.from("community_posts").select("id").eq("id", input.submissionId).eq("user_id", user.id).maybeSingle();
    if (existing) { revalidatePath("/community"); return { ok: true, id: existing.id }; }
  }
  const isQuestion = input.postType === "question";
  const snapshot = !isQuestion && input.workoutDate ? await getShareableWorkout(input.workoutDate) : null;
  if (!isQuestion && input.workoutDate && !snapshot) return { ok: false, error: "공유할 완료 기록이 없어요." };
  let question: { title: string; body: string | null } | null = null;
  if (isQuestion) {
    const q = validateQuestionInput({ title: input.title ?? "", body: input.caption });
    if (!q.ok) return q;
    question = q;
    const url = input.photoUrl?.trim() ?? "";
    if (url && !/^https?:\/\//.test(url)) return { ok: false, error: "사진 주소가 올바르지 않습니다." };
  } else {
    const check = validatePostInput({
      photoUrl: input.photoUrl,
      caption: input.caption,
      hasWorkout: !!snapshot,
    });
    if (!check.ok) return check;
  }

  const vis = resolveVisibility(input.visibility, input.groupId);
  if (!vis.ok) return vis;


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

  const caption = question ? (question.body ?? "") : input.caption.trim();

  // 🔴 운동 기록 카드는 서버(서비스 롤)만 붙일 수 있다 — DB 지킴이(community_post_guard)가
  //    사용자 권한으로 온 카드를 거절한다. 그래야 앱을 거치지 않고 '하지도 않은 운동 완료' 카드를
  //    만들 수 없다. 서비스 롤은 RLS 를 건너뛰므로, RLS 가 하던 확인(정지 여부·그룹 멤버)을 여기서 한다.
  //    (2026-09-30 커뮤니티 보안 1단계)
  const writer = snapshot ? createSupabaseAdminClient() : supabase;
  if (snapshot) {
    if (!writer) return { ok: false, error: "운동 기록 공유를 지금 쓸 수 없어요. 잠시 후 다시 시도해 주세요." };
    const { data: active } = await supabase.rpc("is_active_member");
    if (active === false) return { ok: false, error: "지금은 글을 쓸 수 없는 상태예요." };
    // 서비스 롤은 DB 쓰기 속도 제한(10분에 5개)도 건너뛰므로 같은 한도를 여기서.
    const since = new Date(Date.now() - POST_RATE_WINDOW_MS).toISOString();
    const { count: recent } = await supabase
      .from("community_posts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gt("created_at", since);
    if ((recent ?? 0) >= POST_RATE_LIMIT) {
      return { ok: false, error: "너무 자주 올리고 있어요. 잠시 후 다시 시도해 주세요." };
    }
    if (vis.visibility !== "public" && vis.groupId) {
      const { data: member } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("group_id", vis.groupId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!member) return { ok: false, error: "그 그룹 멤버만 이 범위로 올릴 수 있어요." };
    }
  }
  const { data, error } = await writer!
    .from("community_posts")
    .insert({
      ...(input.submissionId ? { id: input.submissionId } : {}),
      workout_snapshot: snapshot,
      user_id: user.id,
      group_id: vis.groupId,
      visibility: vis.visibility,
      author_name: authorName,
      photo_url: input.photoUrl.trim() || null,
      caption: caption.length > 0 ? caption : null,
      ...(question ? { post_type: "question", title: question.title } : {}),
    })
    .select("id")
    .single();

  if (error?.code === "23505" && input.submissionId) {
    const { data: existing } = await supabase.from("community_posts").select("id").eq("id", input.submissionId).eq("user_id", user.id).maybeSingle();
    if (existing) { revalidatePath("/community"); return { ok: true, id: existing.id }; }
  }
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
  // 지우기 전에 사진 주소를 읽어 둔다 — 글만 지우면 사진 파일이 저장소에 계속 쌓였다(커뮤니티 2단계).
  const { data: before } = await supabase
    .from("community_posts")
    .select("user_id, photo_url")
    .eq("id", id)
    .maybeSingle();
  const { error } = await supabase.from("community_posts").delete().eq("id", id);

  if (error) return { ok: false, error: error.message };
  const photoPath = communityPhotoPath(
    (before as { photo_url?: string | null } | null)?.photo_url,
    (before as { user_id?: string } | null)?.user_id,
  );
  if (photoPath) {
    // 관리자가 남의 글을 지울 때도 지워지게 서비스 롤로. 실패해도 글 삭제는 이미 끝났다(파일만 남음).
    await createSupabaseAdminClient()
      ?.storage.from("community-photos")
      .remove([photoPath])
      .catch(() => undefined);
  }
  revalidatePath("/community");
  return { ok: true };
}

/** 인증 글 한마디 수정 — 본인 또는 게시물 관리자. 권한은 RLS가 강제. */
export async function editCommunityPostAction(
  id: string,
  caption: string,
  /** 질문 글이면 제목도 고칠 수 있다. */
  title?: string,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  if (!id) return { ok: false, error: "잘못된 요청입니다." };
  const text = (caption ?? "").trim();

  const supabase = await createSupabaseServerClient();
  const { data: cur } = await supabase.from("community_posts").select("post_type").eq("id", id).maybeSingle();
  const isQuestion = (cur as { post_type?: string } | null)?.post_type === "question";
  let patch: { caption: string | null; title?: string } = { caption: text.length > 0 ? text : null };
  if (isQuestion) {
    if (text.length > captionLimit("question")) {
      return { ok: false, error: `본문은 ${captionLimit("question")}자까지 쓸 수 있어요.` };
    }
    if (title !== undefined) {
      const q = validateQuestionInput({ title, body: text });
      if (!q.ok) return q;
      patch = { caption: q.body, title: q.title };
    }
  } else if (text.length > MAX_CAPTION) {
    return { ok: false, error: `한마디는 ${MAX_CAPTION}자까지 쓸 수 있어요.` };
  }
  const { error } = await supabase
    .from("community_posts")
    .update(patch)
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

  const { data: created, error } = await supabase
    .from("community_comments")
    .insert({
      post_id: postId,
      user_id: user.id,
      author_name: authorName,
      body: text,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  // 글쓴이에게 푸시 — 응답을 기다리게 하지 않는다(앱 안 알림은 DB 트리거가 이미 만들었다).
  const commentId = (created as { id: string }).id;
  after(() => pushCommentNotification("comment", commentId));
  revalidatePath("/community");
  return { ok: true };
}

/** 한 글의 댓글 한 페이지 — before 가 있으면 그보다 오래된 것(‘이전 댓글 더 보기’). */
export async function listCommentsAction(
  postId: string,
  before?: string | null,
): Promise<CommentPage> {
  return getPostComments(postId, before);
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

/** 저장(북마크) 토글 — 피드 글만. 남의 저장 목록은 RLS 로 막힌다. */
export async function toggleSaveAction(
  postId: string,
): Promise<{ ok: true; saved: boolean } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  if (!postId) return { ok: false, error: "잘못된 요청입니다." };
  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase
    .from("community_saves")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) {
    const { error } = await supabase.from("community_saves").delete().eq("post_id", postId).eq("user_id", user.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true, saved: false };
  }
  const { error } = await supabase.from("community_saves").insert({ post_id: postId, user_id: user.id });
  if (error?.code === "23505") return { ok: true, saved: true };
  if (error) return { ok: false, error: "저장할 수 없는 글이에요." };
  return { ok: true, saved: true };
}

/** 질문 해결됨 표시/취소 — 작성자만(RLS: 본인 글 수정). */
export async function setQuestionResolvedAction(postId: string, resolved: boolean): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  if (!postId) return { ok: false, error: "잘못된 요청입니다." };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("community_posts")
    .update({ resolved_at: resolved ? new Date().toISOString() : null })
    .eq("id", postId)
    .eq("user_id", user.id)
    .eq("post_type", "question")
    .select("id");
  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) return { ok: false, error: "내 질문만 바꿀 수 있어요." };
  revalidatePath("/community");
  return { ok: true };
}

/** 알림 읽음 표시 — ids 가 없으면 전부. */
export async function markCommunityNotificationsReadAction(ids?: string[]): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("mark_community_notifications_read", { ids: ids && ids.length ? ids : null });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
