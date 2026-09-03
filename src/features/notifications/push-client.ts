"use client";

import { savePushSubscriptionAction } from "@/features/notifications/push-actions";
import { reportAppEvent } from "@/lib/observability/report-client";

/** VAPID 공개키(base64url) → Uint8Array (pushManager.subscribe 요구 형식). */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/**
 * 푸시 구독을 보장하고 서버에 저장한다. 권한이 granted 이고 SW 가 등록돼 있을 때만.
 * (dev 모드엔 SW 가 없어 no-op. 권한 없으면 no-op.) 실패해도 조용히 넘어간다.
 */
export async function ensurePushSubscribed(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapid) return;

  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return; // SW 미등록(dev) — 닫힌 앱 푸시는 prod 에서만
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid) as unknown as BufferSource,
      });
    }
    const json = sub.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;
    await savePushSubscriptionAction({
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      userAgent: navigator.userAgent,
    });
  } catch (e) {
    // 여기서 실패하면 **알림이 조용히 안 간다** — 사용자는 알 방법이 없고
    // 우리도 몰랐다. 기능은 그대로 넘어가되(아래 noop) 사실은 남긴다.
    reportAppEvent("push_register_failure", {
      message: e instanceof Error ? e.message : "구독 저장 실패",
    });
  }
}
