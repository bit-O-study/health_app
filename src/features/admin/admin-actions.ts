"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/features/admin/admin";
import { genTempPassword, tempPasswordEmail } from "@/features/auth/password-reset";
import { sendEmail } from "@/lib/email/send";

export type AdminActionResult = { ok: true } | { ok: false; error: string };

/** 비밀번호 초기화 결과 — 임시 비번과 메일 발송 여부를 관리자 화면에 전달. */
export type ResetPasswordResult =
  | { ok: true; tempPassword: string; emailed: boolean; note?: string }
  | { ok: false; error: string };

function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

/** 회원(이메일)을 관리자로 지정. 관리자만 가능(RLS 도 이중 차단). */
export async function addAdminAction(email: string): Promise<AdminActionResult> {
  if (!(await isAdminUser())) {
    return { ok: false, error: "관리자만 가능합니다." };
  }
  const e = email.trim().toLowerCase();
  if (!isEmail(e)) return { ok: false, error: "올바른 이메일을 입력하세요." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("admins")
    .upsert({ email: e }, { onConflict: "email" });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/settings");
  return { ok: true };
}

/** 관리자 해제. 마지막 1명은 제거 불가(잠김 방지). */
export async function removeAdminAction(
  email: string,
): Promise<AdminActionResult> {
  if (!(await isAdminUser())) {
    return { ok: false, error: "관리자만 가능합니다." };
  }
  const supabase = await createSupabaseServerClient();

  const { count } = await supabase
    .from("admins")
    .select("email", { count: "exact", head: true });
  if ((count ?? 0) <= 1) {
    return { ok: false, error: "마지막 관리자는 해제할 수 없습니다." };
  }

  const { error } = await supabase
    .from("admins")
    .delete()
    .eq("email", email.trim().toLowerCase());
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/settings");
  return { ok: true };
}

/** 정지/차단 값을 admin_set_user_ban RPC 로 설정(관리자 게이트는 DB 함수 내부). */
async function setUserBan(
  userId: string,
  suspendedUntil: string | null,
  bannedAt: string | null,
  reason: string | null,
): Promise<AdminActionResult> {
  if (!(await isAdminUser())) {
    return { ok: false, error: "관리자만 가능합니다." };
  }
  if (!userId) return { ok: false, error: "회원이 올바르지 않습니다." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_set_user_ban", {
    p_user_id: userId,
    p_suspended_until: suspendedUntil,
    p_banned_at: bannedAt,
    p_reason: reason,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/members");
  return { ok: true };
}

/** 기간 정지 — days 일 후 자동 해제. 영구정지는 해제(같이 정지로 전환). */
export async function suspendUserAction(
  userId: string,
  days: number,
  reason?: string,
): Promise<AdminActionResult> {
  if (!Number.isFinite(days) || days <= 0 || days > 3650) {
    return { ok: false, error: "정지 기간(일)이 올바르지 않습니다." };
  }
  const until = new Date(Date.now() + days * 86_400_000).toISOString();
  return setUserBan(userId, until, null, reason?.trim() || null);
}

/** 영구정지 — 수동 해제 전까지 차단. */
export async function banUserAction(
  userId: string,
  reason?: string,
): Promise<AdminActionResult> {
  const now = new Date().toISOString();
  return setUserBan(userId, null, now, reason?.trim() || null);
}

/** 정지/영구정지 해제 — 모두 null 로 초기화. */
export async function unbanUserAction(
  userId: string,
): Promise<AdminActionResult> {
  return setUserBan(userId, null, null, null);
}

/**
 * 관리자: 회원 비밀번호를 임시 비밀번호로 초기화.
 * admin_reset_user_password RPC(SECURITY DEFINER, is_admin 게이트)로 auth.users
 * 비번을 갱신하고 must_change_password=true 로 만든다. 임시 비번은 회원 이메일로
 * 발송하고(키 없으면 생략) 관리자 화면에도 표시한다(직접 전달/메일 미설정 대비).
 */
export async function resetMemberPasswordAction(
  userId: string,
  email: string | null,
): Promise<ResetPasswordResult> {
  if (!(await isAdminUser())) {
    return { ok: false, error: "관리자만 가능합니다." };
  }
  if (!userId) return { ok: false, error: "회원이 올바르지 않습니다." };

  const supabase = await createSupabaseServerClient();
  const temp = genTempPassword();
  const { error } = await supabase.rpc("admin_reset_user_password", {
    p_user_id: userId,
    p_password: temp,
  });
  if (error) return { ok: false, error: error.message };

  let emailed = false;
  let note: string | undefined;
  if (email) {
    const { subject, html, text } = tempPasswordEmail(temp);
    const r = await sendEmail({ to: email, subject, html, text });
    if (r.ok) {
      emailed = !r.skipped;
      if (r.skipped) {
        note = "메일 발송이 설정되지 않아(RESEND_API_KEY) 보내지 못했습니다. 임시 비번을 직접 전달하세요.";
      }
    } else {
      note = `메일 발송 실패: ${r.error}`;
    }
  } else {
    note = "이메일 정보가 없어 메일을 보내지 못했습니다. 임시 비번을 직접 전달하세요.";
  }

  revalidatePath("/admin/members");
  return { ok: true, tempPassword: temp, emailed, note };
}

/** 회원탈퇴 복구 — withdrawn_at = null (소프트 탈퇴 되돌림). 관리자만. */
export async function restoreUserAction(
  userId: string,
): Promise<AdminActionResult> {
  if (!(await isAdminUser())) {
    return { ok: false, error: "관리자만 가능합니다." };
  }
  if (!userId) return { ok: false, error: "회원이 올바르지 않습니다." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_restore_user", {
    p_user_id: userId,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/members");
  return { ok: true };
}
