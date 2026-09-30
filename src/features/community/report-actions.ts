"use server";

import { revalidatePath } from "next/cache";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import {
  isValidReason,
  type ReportTargetKind,
} from "@/features/community/report";

type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * 신고 대상 원본을 서버에서 찾는 방법 — 종류별 표와 미리보기 칸.
 *
 * 🔴 대상 사용자·작성자·미리보기는 **앱이 보낸 값을 믿지 않는다**(2026-09-30 커뮤니티 보안 1단계).
 *    예전엔 글·댓글 신고가 앱이 보낸 대상 사용자를 그대로 저장해서, 요청을 조작하면 관리자가
 *    '정지' 를 눌렀을 때 엉뚱한 사람이 정지될 수 있었다. 신고자가 볼 수 있는 원본만 찾는다(RLS).
 */
const TARGET_SOURCE: Record<
  ReportTargetKind,
  { table: string; columns: string; preview: (row: Record<string, unknown>) => string }
> = {
  community_post: { table: "community_posts", columns: "user_id, author_name, caption", preview: (r) => String(r.caption ?? "") },
  community_comment: { table: "community_comments", columns: "user_id, author_name, body", preview: (r) => String(r.body ?? "") },
  teaching_post: {
    table: "teaching_posts",
    columns: "user_id, author_name, exercise_tag, caption",
    preview: (r) => [r.exercise_tag, r.caption].filter(Boolean).join(" · "),
  },
  teaching_comment: { table: "teaching_comments", columns: "user_id, author_name, body", preview: (r) => String(r.body ?? "") },
  routine_share: {
    table: "routine_shares",
    columns: "user_id, author_name, title, caption",
    preview: (r) => [r.title, r.caption].filter(Boolean).join(" · "),
  },
};

/**
 * 게시글/댓글/루틴 신고 등록. 로그인 유저 누구나. 신고가 쌓이면 관리자페이지에서 처리한다.
 * target_author/target_preview 는 신고 당시 스냅샷(관리자 화면에서 원본 없이도 식별용) — 서버가 채운다.
 */
export async function reportContentAction(input: {
  targetKind: ReportTargetKind;
  targetId: string;
  /** @deprecated 무시한다 — 서버가 원본에서 찾는다. 예전 호출부 호환용. */
  targetUserId?: string | null;
  /** @deprecated 무시한다. */
  targetAuthor?: string | null;
  /** @deprecated 무시한다. */
  targetPreview?: string | null;
  reason: string;
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  if (!input.targetId) return { ok: false, error: "잘못된 요청입니다." };
  if (!isValidReason(input.reason)) {
    return { ok: false, error: "신고 사유를 입력해주세요(1~500자)." };
  }

  const supabase = await createSupabaseServerClient();

  const source = TARGET_SOURCE[input.targetKind];
  if (!source) return { ok: false, error: "잘못된 요청입니다." };
  const { data: row } = await supabase
    .from(source.table)
    .select(source.columns)
    .eq("id", input.targetId)
    .maybeSingle();
  const original = row as Record<string, unknown> | null;
  if (!original) return { ok: false, error: "삭제되었거나 볼 수 없는 게시물이에요." };
  if (original.user_id === user.id) {
    return { ok: false, error: "내가 올린 글은 신고할 수 없어요." };
  }
  const targetUserId = String(original.user_id);
  const targetAuthor = typeof original.author_name === "string" ? original.author_name : null;
  const targetPreview = source.preview(original);

  // 같은 대상 중복 신고는 DB 유일 인덱스가 막는다(아래 23505). 신고 목록은 관리자만 읽을 수 있어
  // 앱에서 미리 조회하는 방식으로는 막을 수 없었다.

  const { error } = await supabase.from("post_reports").insert({
    target_kind: input.targetKind,
    target_id: input.targetId,
    target_user_id: targetUserId,
    target_author: targetAuthor,
    target_preview: (targetPreview ?? "").slice(0, 200) || null,
    reporter_id: user.id,
    reason: input.reason.trim().slice(0, 500),
  });
  if (error?.code === "23505") {
    return { ok: false, error: "이미 신고한 게시물이에요." };
  }
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/reports");
  return { ok: true };
}
