import { ADMIN_CONSOLE_URL } from "@/features/auth/oauth-redirect";

/** Only the app and its admin console are valid notification destinations. */
export function notificationTarget(value: unknown, origin: string): string | null {
  if (typeof value !== "string" || !value) return null;
  try {
    let url = new URL(value, origin);
    if (url.origin === origin && /^\/admin(?:\/|$)/.test(url.pathname)) {
      url = new URL(`${ADMIN_CONSOLE_URL}/health${url.pathname.slice(6)}${url.search}`);
    }
    if (url.username || url.password) return null;
    return url.origin === origin || url.origin === new URL(ADMIN_CONSOLE_URL).origin ? url.href : null;
  } catch { return null; }
}
