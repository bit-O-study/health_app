import type { SupabaseClient } from "@supabase/supabase-js";

import { normalizePhone } from "@/features/auth/phone";

/**
 * 휴대폰 OTP 발송 시도(로그인 전, 기존 가입 회원). 성공 true(인증번호 입력 필요),
 * 실패 false(SMS 미설정/미등록 번호 등 → 인증 생략하고 진행). 회원가입 플로우의
 * graceful degradation 과 동일한 정책.
 */
export async function sendPhoneOtp(
  supabase: SupabaseClient,
  phone: string,
): Promise<boolean> {
  const { error } = await supabase.auth.signInWithOtp({
    phone: normalizePhone(phone),
    options: { shouldCreateUser: false },
  });
  return !error;
}

/** OTP 검증. 성공 시 생성된 세션은 즉시 로컬 정리(찾기 플로우는 로그인이 목적이 아님). */
export async function verifyPhoneOtp(
  supabase: SupabaseClient,
  phone: string,
  code: string,
): Promise<boolean> {
  const { error } = await supabase.auth.verifyOtp({
    phone: normalizePhone(phone),
    token: code.trim(),
    type: "sms",
  });
  if (!error) {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      /* 세션 정리 실패는 무시 */
    }
  }
  return !error;
}
