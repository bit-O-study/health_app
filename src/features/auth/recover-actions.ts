"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * 아이디 찾기 / 비밀번호 찾기 — 로그인 전(익명) 호출.
 * 신원 확인은 DB SECURITY DEFINER 함수(find_login_email / reset_password_by_identity)가
 * profiles 의 이름/휴대폰·이메일/휴대폰 매칭으로 수행한다. 휴대폰 OTP 는 화면(클라이언트)
 * 에서 실질적 게이트로 사용(로컬은 생략).
 */

export type FindEmailResult =
  | { ok: true; email: string | null }
  | { ok: false; error: string };

/** 이름 + 휴대폰 → 가입 이메일 반환(없으면 email=null). */
export async function findLoginEmailAction(
  name: string,
  phone: string,
): Promise<FindEmailResult> {
  if (!name.trim() || !phone.trim()) {
    return { ok: false, error: "이름과 휴대폰 번호를 입력해 주세요." };
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("find_login_email", {
    p_name: name.trim(),
    p_phone: phone.trim(),
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, email: (data as string | null) ?? null };
}

export type ResetResult =
  | { ok: true; matched: boolean }
  | { ok: false; error: string };

/**
 * 비밀번호 찾기 — 휴대폰 OTP 인증 후, 화면에서 입력한 새 비밀번호로 즉시 변경.
 * 이메일 + 휴대폰이 가입 정보와 일치하면 그 자리에서 새 비번을 적용(matched=true).
 * 일치하지 않으면 matched=false 로 사용자에게 안내한다(임시비번/메일 발송 없음).
 */
export async function resetPasswordWithIdentityAction(
  email: string,
  phone: string,
  newPassword: string,
): Promise<ResetResult> {
  if (!email.trim() || !phone.trim()) {
    return { ok: false, error: "이메일과 휴대폰 번호를 입력해 주세요." };
  }
  if (newPassword.length < 6) {
    return { ok: false, error: "비밀번호는 6자 이상이어야 합니다." };
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("reset_password_by_identity", {
    p_email: email.trim(),
    p_phone: phone.trim(),
    p_new_password: newPassword,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, matched: data === true };
}
