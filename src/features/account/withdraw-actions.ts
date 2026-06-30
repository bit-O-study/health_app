"use server";

import { revalidatePath } from "next/cache";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";

export type WithdrawResult = { ok: true } | { ok: false; error: string };

/**
 * 본인 자가탈퇴(소프트). profiles.withdrawn_at 을 기록하고 세션을 종료한다.
 * 데이터는 유지돼 관리자가 복구(withdrawn_at = null)할 수 있다.
 */
export async function withdrawSelfAction(
  reason?: string,
): Promise<WithdrawResult> {
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  // 본인-only update RLS 로 자기 행만 수정 가능.
  const { error } = await supabase
    .from("profiles")
    .update({ withdrawn_at: new Date().toISOString() })
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  // 탈퇴 사유 best-effort 저장 — withdraw_reason 컬럼이 없으면 조용히 무시(탈퇴엔 영향 없음).
  if (reason && reason.trim()) {
    const { error: rErr } = await supabase
      .from("profiles")
      .update({ withdraw_reason: reason.trim().slice(0, 500) })
      .eq("user_id", user.id);
    if (rErr) {
      // 컬럼 미존재 등 — 무시. (분석이 필요하면 profiles.withdraw_reason 컬럼 추가)
    }
  }

  // 즉시 로그아웃 — 쿠키 정리. 이후 미들웨어가 탈퇴 상태를 차단한다.
  try {
    await supabase.auth.signOut();
  } catch {
    /* signOut 실패해도 탈퇴는 기록됨 */
  }
  revalidatePath("/", "layout");
  return { ok: true };
}