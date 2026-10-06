const PUBLIC_ORIGIN = "https://health-app-five-iota.vercel.app";

/** Sharing must never use the native shell/localhost or a preview host as its fallback. */
export function groupInviteOrigin(configured?: string): string {
  try {
    const url = new URL(configured?.trim() || PUBLIC_ORIGIN);
    if (url.protocol !== "https:" || url.username || url.password || ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) return PUBLIC_ORIGIN;
    return url.origin;
  } catch { return PUBLIC_ORIGIN; }
}

export function groupInviteUrl(token: string, configured?: string): string {
  return `${groupInviteOrigin(configured)}/groups/join/${encodeURIComponent(token)}`;
}
