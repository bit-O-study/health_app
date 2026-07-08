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
 * 게시글/댓글 신고 등록. 로그인 유저 누구나. 신고가 쌓이면 관리자페이지에서 처리한다.
 * target_author/target_preview 는 신고 당시 스냅샷(관리자 화면에서 원본 없이도 식별용).
 */
export async function reportContentAction(input: {
  targetKind: ReportTargetKind;
  targetId: string;
  targetUserId?: string | null;
  targetAuthor?: string | null;
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

  // 같은 대상에 대한 내 중복 신고는 막는다(스팸 방지).
  const { data: dup } = await supabase
    .from("post_reports")
    .select("id")
    .eq("target_kind", input.targetKind)
    .eq("target_id", input.targetId)
    .eq("reporter_id", user.id)
    .limit(1);
  if (dup && dup.length > 0) {
    return { ok: false, error: "이미 신고한 게시물이에요." };
  }

  const { error } = await supabase.from("post_reports").insert({
    target_kind: input.targetKind,
    target_id: input.targetId,
    target_user_id: input.targetUserId ?? null,
    target_author: input.targetAuthor ?? null,
    target_preview: (input.targetPreview ?? "").slice(0, 200) || null,
    reporter_id: user.id,
    reason: input.reason.trim().slice(0, 500),
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/reports");
  return { ok: true };
}
