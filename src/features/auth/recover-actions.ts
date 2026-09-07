"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { otpEmail } from "@/features/auth/password-reset";
import { sendEmail } from "@/lib/email/send";
import { consumeAllRates, requestOrigin } from "@/lib/rate-limit/consume";
import { identityKey, limitMessage } from "@/lib/rate-limit/policy";

/**
 * 아이디 찾기 / 비밀번호 찾기 — 로그인 전(익명) 호출.
 * 신원 확인은 DB SECURITY DEFINER 함수(find_login_email / reset_password_by_identity)가
 * profiles 의 이름/휴대폰·이메일/휴대폰 매칭으로 수행한다.
 *
 * ## 🔴 여기엔 관문이 없다 — 그래서 속도를 묶는다
 * 2026-09-04 사용자 결정으로 휴대폰 OTP 를 걷어냈다. 지금은 이름+휴대폰만 맞으면
 * 가입 이메일이 그대로 나온다. 한 번은 정상 사용이고 수천 번은 **가입자 명부 긁기**다.
 * 관문을 되살리는 대신(결정을 되돌리지 않는다) `rate-limit` 으로 시도 속도만 제한한다 —
 * 진짜 사용자는 두세 번이면 끝나고, 긁는 쪽은 수천 번이 필요하다.
 *
 * 열쇠는 **신원과 출처 둘 다**. 신원만 묶으면 값을 바꿔 가며 두드리면 되고, 출처만
 * 묶으면 공용 와이파이에서 한 사람이 남들 것까지 태운다(`policy.ts` 참고).
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
  const allowed = await consumeAllRates([
    ["find-id:identity", identityKey(name, phone)],
    ["find-id:ip", await requestOrigin()],
  ]);
  if (!allowed) return { ok: false, error: limitMessage("find-id:identity") };

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
  // 메일이 실제로 나가는 요청이다 — 반복 요청은 남의 받은편지함을 우리가 채우는 일.
  const allowed = await consumeAllRates([
    ["pw-otp:identity", identityKey(email, phone)],
    ["pw-otp:ip", await requestOrigin()],
  ]);
  if (!allowed) return { ok: false, error: limitMessage("pw-otp:identity") };

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
  // 인증번호 5회 실패 잠금은 DB(verify_otp_and_reset)가 한다. 여기선 그 잠금을
  // 우회하려고 이메일을 바꿔 가며 두드리는 걸 막는다 — 그래서 출처 기준 하나만.
  const allowed = await consumeAllRates([["pw-verify:ip", await requestOrigin()]]);
  if (!allowed) return { ok: false, error: limitMessage("pw-verify:ip") };

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
