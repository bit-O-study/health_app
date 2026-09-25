export const CATEGORIES = { bug: "버그 신고", feedback: "불편 신고", idea: "기능 제안", other: "기타 문의" };
export const STATUSES = { new: "접수", in_progress: "확인 중", waiting_user: "답변 대기", resolved: "해결", closed: "종료" };
export const DELIVERY = { queued: "발송 대기", processing: "처리 중", api_succeeded: "카카오 API 전송 성공", failed: "실패", unknown: "전송 여부 확인 필요", quota_deferred: "무료 한도 대기", needs_reconnect: "카카오 재연결 필요", canceled: "취소" };
export type Ticket = { id: string; number: number; user_id: string; title: string; category: keyof typeof CATEGORIES; status: keyof typeof STATUSES; priority: string; assignee: string | null; diagnostics: Record<string, string>; created_at: string; updated_at: string; admin_read_at: string | null; user_read_at: string | null };
export const uuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export function validateTicket(category: string, title: string, body: string) {
  if (!Object.hasOwn(CATEGORIES, category)) return "문의 종류를 선택해 주세요.";
  if (!title.trim() || title.trim().length > 100) return "제목은 1~100자로 입력해 주세요.";
  if (!body.trim() || body.trim().length > 5000) return "내용은 1~5000자로 입력해 주세요.";
  return null;
}
export function diagnostics(input: unknown): Record<string, string> {
  if (!input || typeof input !== "object") return {};
  const v = input as Record<string, unknown>;
  const out: Record<string, string> = {};
  // Only categorical data; no raw URL, user agent, console output or account data.
  for (const key of ["platform", "version", "viewport"]) {
    if (typeof v[key] === "string" && /^[a-zA-Z0-9 .x_-]{1,50}$/.test(v[key])) out[key] = v[key];
  }
  return out;
}
export function kakaoResult(status: number, body: { result_code?: number; code?: number }) {
  if (status >= 200 && status < 300 && body.result_code === 0) return { status: "api_succeeded", code: null };
  if (status === 429 || body.code === -10 || body.code === -532) return { status: "quota_deferred", code: "quota" };
  if (status === 401 || body.code === -401 || body.code === -402) return { status: "needs_reconnect", code: "auth" };
  if (status >= 400 && status < 500) return { status: "failed", code: "request_rejected" };
  return { status: "unknown", code: "uncertain_response" };
}

/** Next may expose an internal request URL behind its proxy; compare the browser Origin to Host. */
export function isSupportOrigin(origin: string | null, host: string | null) {
  if (!origin || !host) return false;
  try {
    const url = new URL(origin);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    return url.host === host && (url.protocol === "https:" || (local && url.protocol === "http:"));
  } catch { return false; }
}
