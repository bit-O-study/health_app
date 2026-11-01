import { ADMIN_CONSOLE_URL, LEGACY_ADMIN_CONSOLE_ORIGINS } from "@/features/auth/oauth-redirect";

/** Only the app and its admin console are valid notification destinations. */
export function notificationTarget(value: unknown, origin: string): string | null {
  if (typeof value !== "string" || !value) return null;
  try {
    let url = new URL(value, origin);
    if (url.origin === origin && /^\/admin(?:\/|$)/.test(url.pathname)) {
      url = new URL(`${ADMIN_CONSOLE_URL}/health${url.pathname.slice(6)}${url.search}`);
    }
    if (url.username || url.password) return null;
    const consoles = [new URL(ADMIN_CONSOLE_URL).origin, ...LEGACY_ADMIN_CONSOLE_ORIGINS];
    return url.origin === origin || consoles.includes(url.origin) ? url.href : null;
  } catch { return null; }
}
