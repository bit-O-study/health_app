import { describe, expect, it } from "vitest";

import { isNativeAppFrom } from "@/lib/platform/is-native-app";

// 회귀: window.Capacitor 는 웹 브라우저에도 주입된다(@capacitor/core import 시, platform "web").
// '존재'로 앱을 판별하면 일반 웹 사용자가 전부 앱으로 잡혀,
// RouteKeeper 의 '보던 화면 복원'이 웹에서도 돌아 운동 탭을 새로 열 때 직전 화면으로 튕겼다.

const WEB_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0 Mobile Safari/537.36";
const APP_UA = `${WEB_UA} helssu-app`;

describe("isNativeAppFrom — 네이티브 앱 판별", () => {
  it("웹 브라우저에 Capacitor 가 주입돼 있어도(platform: web) 앱이 아니다", () => {
    expect(isNativeAppFrom(WEB_UA, { isNativePlatform: () => false })).toBe(false);
  });

  it("Capacitor 자체가 없으면 앱 아님", () => {
    expect(isNativeAppFrom(WEB_UA, undefined)).toBe(false);
  });

  it("isNativePlatform() 이 true 면 앱", () => {
    expect(isNativeAppFrom(WEB_UA, { isNativePlatform: () => true })).toBe(true);
  });

  it("UA 표식(helssu-app)이 있으면 브릿지 주입이 실패해도 앱(capacitor#7269)", () => {
    expect(isNativeAppFrom(APP_UA, undefined)).toBe(true);
    expect(isNativeAppFrom(APP_UA, { isNativePlatform: () => false })).toBe(true);
  });

  it("isNativePlatform 이 없는 옛 브릿지 객체는 앱으로 치지 않는다(존재≠앱)", () => {
    expect(isNativeAppFrom(WEB_UA, {})).toBe(false);
  });
});
