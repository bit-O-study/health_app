"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { otpEmail } from "@/features/auth/password-reset";
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

export type OtpRequestResult =
  | { ok: true; matched: boolean }
  | { ok: false; error: string };

/**
 * 비밀번호 찾기 1단계 — 이메일 + 휴대폰이 가입정보와 일치하면 6자리 인증번호를 생성해
 * 그 이메일로 발송(matched=true). 일치하지 않으면 matched=false(메일 없음).
 * 인증번호는 클라이언트로 반환하지 않는다(이메일로만 전달).
 */
export async function requestEmailOtpAction(
  email: string,
  phone: string,
): Promise<OtpRequestResult> {
  if (!email.trim() || !phone.trim()) {
    return { ok: false, error: "이메일과 휴대폰 번호를 입력해 주세요." };
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("request_password_otp", {
    p_email: email.trim(),
    p_phone: phone.trim(),
  });
  if (error) return { ok: false, error: error.message };

  const code = (data as string | null) ?? null;
  if (!code) return { ok: true, matched: false };

  const { subject, html, text } = otpEmail(code);
  const sent = await sendEmail({ to: email.trim(), subject, html, text });
  if (!sent.ok) return { ok: false, error: `메일 발송 실패: ${sent.error}` };
  return { ok: true, matched: true };
}

export type OtpVerifyResult =
  | { ok: true; status: "ok" | "invalid" | "expired" | "locked" | "nomatch" }
  | { ok: false; error: string };

/**
 * 비밀번호 찾기 2단계 — 이메일로 받은 인증번호 검증 후 새 비밀번호로 변경.
 * status: ok(성공) | invalid(번호 틀림) | expired(만료) | locked(5회초과) | nomatch(정보불일치).
 */
export async function verifyEmailOtpAndResetAction(
  email: string,
  phone: string,
  code: string,
  newPassword: string,
): Promise<OtpVerifyResult> {
  if (!email.trim() || !phone.trim() || !code.trim()) {
    return { ok: false, error: "인증번호를 입력해 주세요." };
  }
  if (newPassword.length < 6) {
    return { ok: false, error: "비밀번호는 6자 이상이어야 합니다." };
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("verify_otp_and_reset", {
    p_email: email.trim(),
    p_phone: phone.trim(),
    p_code: code.trim(),
    p_new_password: newPassword,
  });
  if (error) return { ok: false, error: error.message };
  return {
    ok: true,
    status: data as "ok" | "invalid" | "expired" | "locked" | "nomatch",
  };
}
