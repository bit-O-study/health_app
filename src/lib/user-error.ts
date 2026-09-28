/** Safe Korean copy for service errors. Unknown backend messages stay out of the UI. */
export function userErrorMessage(error: unknown, fallback = "요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요."): string {
  const value = error && typeof error === "object" ? error as { code?: string; message?: string; status?: number } : {};
  const code = value.code ?? "";
  const message = typeof error === "string" ? error : value.message ?? "";
  if (code === "invalid_credentials" || /invalid login credentials/i.test(message)) return "이메일 또는 비밀번호가 올바르지 않습니다.";
  if (code === "email_not_confirmed" || /email not confirmed/i.test(message)) return "이메일 인증이 필요해요. 받은 메일의 인증 링크를 확인해 주세요.";
  if (value.status === 429 || /rate_limit|over_.*limit|too_many/i.test(code) || /too many|rate limit/i.test(message)) return "요청이 많아 잠시 쉬어야 해요. 잠시 후 다시 시도해 주세요.";
  if (code === "user_already_exists" || /already registered/i.test(message)) return "이미 가입된 이메일이에요. 로그인하거나 비밀번호를 찾아 주세요.";
  if (code === "weak_password") return "더 안전한 비밀번호를 입력해 주세요.";
  if (value.status === 401 || code === "session_not_found") return "로그인이 만료됐어요. 다시 로그인해 주세요.";
  if (/failed to fetch|network|load failed/i.test(message)) return "연결이 불안정해요. 인터넷 연결을 확인하고 다시 시도해 주세요.";
  return fallback;
}
