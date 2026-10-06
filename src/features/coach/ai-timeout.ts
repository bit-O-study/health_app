/**
 * AI 호출 시간 제한 — 2026-09-30.
 *
 * 🔴 예전엔 AI 서버 요청에 시간 제한이 없었다. 무료 서버(NVIDIA)가 답을 안 주면 서버 액션이
 *    끝나지 않아 버튼이 영원히 '처리 중'이었다(실측: 120초 넘게 무응답). 60초면 느린 비전 호출도
 *    충분하고, 넘으면 다시 시도하라고 안내한다.
 */
export const AI_TIMEOUT_MS = 60_000;

/** fetch 실패 → 사용자 문장. 시간 초과는 따로 말한다(고장이 아니라 늦은 것). */
export function aiFetchError(e: unknown): string {
  const name = (e as { name?: string } | null)?.name;
  if (name === "TimeoutError" || name === "AbortError") {
    return "AI 응답이 늦어요. 잠시 뒤 다시 시도해 주세요.";
  }
  return `요청 실패: ${(e as Error | null)?.message ?? "알 수 없는 오류"}`;
}
