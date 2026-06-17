/** 로컬(개발) 환경이면 핸드폰 인증(OTP)을 건너뛴다. 운영에선 SMS OTP 진행. */
export function isLocalEnv(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1" || h === "0.0.0.0";
}

/**
 * 전화번호를 E.164 비슷하게 정규화 (한국 0으로 시작하면 +82 로).
 * DB 의 public.norm_phone() 과 동일 규칙이어야 매칭이 맞는다.
 */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^0-9+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("0")) return "+82" + digits.slice(1);
  return digits;
}
