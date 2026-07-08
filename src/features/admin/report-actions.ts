"use server";

import { revalidatePath } from "next/cache";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { isPostModerator } from "@/features/admin/admin";
import { suspendUserAction } from "@/features/admin/admin-actions";
import type { ReportTargetKind } from "@/features/community/report";

type Result = { ok: true } | { ok: false; error: string };

const TABLE: Record<ReportTargetKind, string> = {
  community_post: "community_posts",
  community_comment: "community_comments",
  teaching_post: "teaching_posts",
  teaching_comment: "teaching_comments",
};

async function requireModerator() {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "로그인이 필요합니다." };
  if (!(await isPostModerator())) {
    return { ok: false as const, error: "권한이 없습니다." };
  }
  return { ok: true as const };
}

/** 신고 처리완료 표시(콘텐츠는 그대로 두고 신고만 닫음). */
export async function resolveReportAction(reportId: string): Promise<Result> {
  const gate = await requireModerator();
  if (!gate.ok) return gate;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("post_reports")
    .update({ status: "resolved" })
    .eq("id", reportId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/reports");
  return { ok: true };
}

/** 신고된 글/댓글 삭제 + 그 대상의 열린 신고들을 모두 처리완료로. */
export async function deleteReportedContentAction(
  targetKind: ReportTargetKind,
  targetId: string,
): Promise<Result> {
  const gate = await requireModerator();
  if (!gate.ok) return gate;
  const supabase = await createSupabaseServerClient();

  // RLS 의 모더레이터 삭제 정책으로 남의 글/댓글도 삭제 가능.
  const del = await supabase.from(TABLE[targetKind]).delete().eq("id", targetId);
  if (del.error) return { ok: false, error: del.error.message };

  // 같은 대상에 걸린 신고 전부 닫기.
  await supabase
    .from("post_reports")
    .update({ status: "resolved" })
    .eq("target_kind", targetKind)
    .eq("target_id", targetId);

  revalidatePath("/admin/reports");
  revalidatePath("/community");
  return { ok: true };
}

/** 신고된 작성자 정지(일수) + 그 유저 관련 신고 닫기. */
export async function suspendReportedUserAction(
  userId: string,
  days: number,
  reason?: string,
): Promise<Result> {
  const gate = await requireModerator();
  if (!gate.ok) return gate;

  const r = await suspendUserAction(userId, days, reason);
  if (!r.ok) return r;

  const supabase = await createSupabaseServerClient();
  await supabase
    .from("post_reports")
    .update({ status: "resolved" })
    .eq("target_user_id", userId);

  revalidatePath("/admin/reports");
  return { ok: true };
}
