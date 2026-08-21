import { Capacitor } from "@capacitor/core";

import { saveFcmTokenAction } from "@/features/notifications/push-actions";

/**
 * 네이티브(안드로이드) 앱에서 FCM 푸시 등록 — 상태표시줄 알림용.
 * 웹/브라우저에서는 아무것도 안 한다(Capacitor 네이티브 플랫폼일 때만).
 * 토큰을 받으면 서버(fcm_tokens)에 저장한다.
 */
let started = false;

export async function hasNativePushPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !Capacitor?.isNativePlatform?.()) {
    return false;
  }
  try {
    const { PushNotifications } = await import(
      "@capacitor/push-notifications"
    );
    const permission = await PushNotifications.checkPermissions();
    return permission.receive === "granted";
  } catch {
    return false;
  }
}

export async function registerNativePush(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    if (!Capacitor?.isNativePlatform?.()) return;
    if (started) return;
    started = true;

    const { PushNotifications } = await import(
      "@capacitor/push-notifications"
    );

    let perm = await PushNotifications.checkPermissions();
    if (perm.receive !== "granted") {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive !== "granted") {
      started = false;
      return;
    }

    await PushNotifications.removeAllListeners();
    await PushNotifications.addListener("registration", (token) => {
      void saveFcmTokenAction(token.value);
    });
    await PushNotifications.addListener("registrationError", () => {
      started = false;
    });

    await PushNotifications.register();
  } catch {
    started = false;
  }
}
