/**
 * 옛 그룹장-트레이너 화면(/groups/[id]/trainer/**)은 독립 트레이너 앱(/trainer)으로 이전됐다.
 * layout 의 redirect() 는 loading.tsx 스트리밍 때문에 200 + meta refresh 가 되어 주소가 그대로 남으므로
 * (console-redirects 와 같은 이유), 렌더 전에 next.config redirects 로 보낸다.
 * next.config 에서 import 하므로 '@/' 별칭 없이 쓴다.
 */
export function legacyTrainerRedirects() {
  return [
    { source: "/groups/:id/trainer", destination: "/trainer", permanent: false },
    { source: "/groups/:id/trainer/:path*", destination: "/trainer", permanent: false },
  ];
}
