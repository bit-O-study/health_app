/**
 * 완료/넘기기 서버 액션의 결과. 이전엔 void 라서 supabase 의 { error } 를
 * 무시하면 실패가 조용히 묻혔다(예: RLS UPDATE 정책 누락). 호출부가 성공/실패를
 * 구분해 사용자에게 알릴 수 있도록 결과를 명시적으로 반환한다.
 */
export type StatusActionResult = { ok: true } | { ok: false; error: string };