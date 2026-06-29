import "server-only";

import webpush from "web-push";

const PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PRIVATE = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:admin@heltch.app";

let configured = false;
function ensureConfigured(): boolean {
  if (configured) return true;
  if (!PUBLIC || !PRIVATE) return false;
  webpush.setVapidDetails(SUBJECT, PUBLIC, PRIVATE);
  configured = true;
  return true;
}

export type PushSub = { endpoint: string; p256dh: string; auth: string };

/**
 * 구독 1건에 웹푸시 전송. 만료(404/410)면 "gone" 을 돌려 호출측이 구독을 정리하게 한다.
 * VAPID 키가 없으면 "error".
 */
export async function sendPush(
  sub: PushSub,
  payload: object,
): Promise<"ok" | "gone" | "error"> {
  if (!ensureConfigured()) return "error";
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
    );
    return "ok";
  } catch (e) {
    const code = (e as { statusCode?: number })?.statusCode;
    if (code === 404 || code === 410) return "gone";
    return "error";
  }
}

/** 웹푸시 사용 가능 여부(VAPID 설정됨). */
export function pushEnabled(): boolean {
  return Boolean(PUBLIC && PRIVATE);
}
