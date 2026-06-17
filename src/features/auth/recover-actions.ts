"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { genTempPassword, tempPasswordEmail } from "@/features/auth/password-reset";
import { sendEmail } from "@/lib/email/send";

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

export type RecoverResult = { ok: true } | { ok: false; error: string };

/**
 * 이메일 + 휴대폰이 일치하면 임시 비밀번호로 초기화하고 이메일로 발송.
 * 계정 존재 여부를 노출하지 않도록(이메일 enumeration 방지) 결과는 항상 동일하게
 * 성공으로 응답한다 — 실제 일치했을 때만 메일이 나간다.
 */
export async function requestPasswordResetAction(
  email: string,
  phone: string,
): Promise<RecoverResult> {
  if (!email.trim() || !phone.trim()) {
    return { ok: false, error: "이메일과 휴대폰 번호를 입력해 주세요." };
  }
  const supabase = await createSupabaseServerClient();
  const temp = genTempPassword();
  const { data, error } = await supabase.rpc("reset_password_by_identity", {
    p_email: email.trim(),
    p_phone: phone.trim(),
    p_new_password: temp,
  });
  if (error) return { ok: false, error: error.message };

  if (data === true) {
    const { subject, html, text } = tempPasswordEmail(temp);
    await sendEmail({ to: email.trim(), subject, html, text });
  }
  return { ok: true };
}
