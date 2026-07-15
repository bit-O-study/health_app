import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { sendPush, pushEnabled } from "@/features/notifications/push";
import { sendFcm, fcmEnabled } from "@/features/notifications/fcm";

export type NotifyPayload = {
  type: string;
  title: string;
  body: string;
  url?: string;
};

/** 웹푸시(브라우저/PWA) 또는 FCM(네이티브 앱) 중 하나라도 설정됐는지. */
export function notifyEnabled(): boolean {
  return pushEnabled() || fcmEnabled();
}

/**
 * 한 사용자의 모든 기기에 알림 전송 — 웹푸시 구독 + FCM 토큰 양쪽으로.
 * 만료된 구독/토큰은 정리한다. admin 은 service-role 클라이언트.
 */
export async function notifyUser(
  admin: SupabaseClient,
  userId: string,
  payload: NotifyPayload,
): Promise<void> {
  // 1) 웹푸시(브라우저·PWA)
  if (pushEnabled()) {
    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", userId);
    for (const s of (subs ?? []) as {
      endpoint: string;
      p256dh: string;
      auth: string;
    }[]) {
      const res = await sendPush(
        { endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth },
        payload,
      );
      if (res === "gone") {
        await admin
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", s.endpoint);
      }
    }
  }

  // 2) FCM(네이티브 안드로이드 앱)
  if (fcmEnabled()) {
    const { data: toks } = await admin
      .from("fcm_tokens")
      .select("token")
      .eq("user_id", userId);
    for (const t of (toks ?? []) as { token: string }[]) {
      const res = await sendFcm(t.token, payload);
      if (res === "gone") {
        await admin.from("fcm_tokens").delete().eq("token", t.token);
      }
    }
  }
}
