import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { NOTIF_ACCENT_COLOR, NOTIF_SMALL_ICON } from "@/features/notifications/notif-icon";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

/**
 * 알림 작은 아이콘은 "이름"으로 찾는다. 이름과 파일이 하나라도 어긋나면 안드로이드가 동그라미 안의 "i" 로 바꿔 버리고,
 * 눈으로는 APK 를 만들어 기기에 띄워 봐야 알 수 있다 — 그래서 어긋남을 여기서 잡는다.
 */
describe("알림 로고 아이콘 — 이름·파일·색이 서로 맞는다", () => {
  const drawable = read(`android/app/src/main/res/drawable/${NOTIF_SMALL_ICON}.xml`);
  const manifest = read("android/app/src/main/AndroidManifest.xml");
  const colors = read("android/app/src/main/res/values/colors.xml");

  it("아이콘 파일 이름이 상수와 같고 벡터 드로어블이다", () => {
    expect(NOTIF_SMALL_ICON).toBe("ic_stat_helssu");
    expect(drawable).toContain("<vector");
    expect(drawable).toContain('android:viewportWidth="100"');
  });

  it("단색(흰색)만 쓴다 — 색이 섞이면 안드로이드가 흰 네모로 그린다", () => {
    const colorsUsed = [...drawable.matchAll(/android:(?:fillColor|strokeColor)="([^"]+)"/g)].map((m) => m[1].toUpperCase());
    expect(colorsUsed.length).toBeGreaterThan(0);
    expect(new Set(colorsUsed)).toEqual(new Set(["#FFFFFF"]));
    expect(drawable).not.toContain("<gradient");
  });

  it("푸시 기본 아이콘·색이 매니페스트에 연결돼 있다", () => {
    expect(manifest).toContain('android:name="com.google.firebase.messaging.default_notification_icon"');
    expect(manifest).toContain(`android:resource="@drawable/${NOTIF_SMALL_ICON}"`);
    expect(manifest).toContain('android:name="com.google.firebase.messaging.default_notification_color"');
    expect(manifest).toContain('android:resource="@color/notification_accent"');
  });

  it("강조색이 상수와 같다", () => {
    const m = colors.match(/<color name="notification_accent">([^<]+)<\/color>/);
    expect(m?.[1].toUpperCase()).toBe(NOTIF_ACCENT_COLOR.toUpperCase());
  });

  it("서버 푸시와 앱 로컬 알림이 같은 상수를 쓴다(옛 샘플 이름이 남지 않는다)", () => {
    const fcm = read("src/features/notifications/fcm.ts");
    const local = read("src/features/notifications/local-notif.ts");
    expect(fcm).toContain("icon: NOTIF_SMALL_ICON");
    expect(fcm).toContain("color: NOTIF_ACCENT_COLOR");
    expect(local).toContain("smallIcon: NOTIF_SMALL_ICON");
    expect(local).not.toContain("ic_stat_icon_config_sample");
  });
});
