import { Capacitor } from "@capacitor/core";

/**
 * 네이티브 로컬 알림 — 예약 시각에 OS 가 상태표시줄 알림을 띄운다(백그라운드·화면꺼짐에도).
 * 웹/브라우저에서는 no-op(네이티브 앱일 때만). 휴식 종료 알림 등에 사용.
 */

const REST_NOTIF_ID = 1001;
let permAsked = false;

async function ensurePerm(): Promise<boolean> {
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  let p = await LocalNotifications.checkPermissions();
  if (p.display !== "granted" && !permAsked) {
    permAsked = true;
    p = await LocalNotifications.requestPermissions();
  }
  return p.display === "granted";
}

/** 휴식 종료(endsAt, ms epoch)에 로컬 알림 예약. 이미 있으면 덮어쓴다. */
export async function scheduleRestLocalNotif(
  endsAt: number,
  title: string,
  body: string,
): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    if (!Capacitor?.isNativePlatform?.()) return;
    if (endsAt <= Date.now() + 500) return; // 이미 지났거나 너무 임박
    if (!(await ensurePerm())) return;
    const { LocalNotifications } = await import(
      "@capacitor/local-notifications"
    );
    await LocalNotifications.cancel({
      notifications: [{ id: REST_NOTIF_ID }],
    }).catch(() => {});
    await LocalNotifications.schedule({
      notifications: [
        {
          id: REST_NOTIF_ID,
          title,
          body,
          schedule: { at: new Date(endsAt), allowWhileIdle: true },
          smallIcon: "ic_stat_icon_config_sample",
        },
      ],
    });
  } catch {
    /* 미지원/실패는 무시 — 화면 비프가 폴백 */
  }
}

/** 예약된 휴식 로컬 알림 취소(건너뛰기·완료·연장 시). */
export async function cancelRestLocalNotif(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    if (!Capacitor?.isNativePlatform?.()) return;
    const { LocalNotifications } = await import(
      "@capacitor/local-notifications"
    );
    await LocalNotifications.cancel({ notifications: [{ id: REST_NOTIF_ID }] });
  } catch {
    /* noop */
  }
}
