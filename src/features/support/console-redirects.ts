import { ADMIN_CONSOLE_URL } from "../auth/oauth-redirect";

/**
 * 문의 관리는 통합 관리자 콘솔(heltch-admin)로 이전됐다. 옛 /admin/support 링크(이미 받은 카카오 알림 등)를
 * 콘솔로 보낸다. 페이지의 redirect() 는 loading.tsx 스트리밍 때문에 200 + meta refresh 가 되므로,
 * 렌더 전에 next.config redirects 로 처리한다. (카카오 연결용 /admin/support/notifications 는 앱에 남는다.)
 * next.config 에서 import 하므로 '@/' 별칭 없이 상대 경로만 쓴다.
 */
export function supportConsoleRedirects() {
  const target = `${ADMIN_CONSOLE_URL}/health/support`;
  return [
    { source: "/admin/support", destination: target, permanent: false },
    {
      source:
        "/admin/support/:id([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})",
      destination: `${target}/:id`,
      permanent: false,
    },
  ];
}
