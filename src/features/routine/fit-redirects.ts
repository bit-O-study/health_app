/**
 * 맞춤 운동 옛 탭 주소(2026-10-07 한 화면 개편) — '내 몸 균형'은 한눈에의 균형 시트로, '성장'은 기록으로.
 * 페이지 redirect() 는 loading.tsx 스트리밍 탓에 주소가 안 바뀌어 렌더 전 next.config redirects 로 보낸다.
 * next.config 에서 import 하므로 '@/' 별칭 없이 쓴다.
 */
export function legacyFitRedirects() {
  return [
    { source: "/fit/balance", destination: "/fit?sheet=balance", permanent: false },
    { source: "/fit/growth", destination: "/fit/report", permanent: false },
  ];
}
