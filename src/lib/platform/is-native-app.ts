/**
 * 지금 네이티브 앱(APK WebView) 안인지 판별 — 클라이언트 전용, 동기.
 * UA 표식(helssu-app, config 와 일치) 또는 Capacitor 가 **네이티브 플랫폼**이라고 답하는지로 본다.
 *
 * ⚠️ `window.Capacitor` 의 **존재만으로 판별하면 안 된다** — `@capacitor/core` 를 import 하는
 * 순간 브라우저에도 주입되고(platform: "web"), 그러면 일반 웹 사용자가 전부 '앱'으로 잡힌다.
 * (이 때문에 RouteKeeper 의 '보던 화면 복원'이 웹에서도 돌아, 운동 탭을 새로 열면 직전에
 * 보던 편집화면으로 튕기는 버그가 있었다. steps-native 는 처음부터 isNativePlatform() 를 썼다.)
 *
 * ⚠️ SSR 에선 window 가 없어 false 를 준다. 렌더 중 직접 쓰면 하이드레이션 불일치가
 * 날 수 있으니, useState(false)+useEffect 로 마운트 후 세팅해서 쓴다.
 */
const NATIVE_UA_MARK = "helssu-app";

/** 브릿지 주입 실패(ionic-team/capacitor#7269)여도 UA 표식이 있으면 앱은 앱. */
type CapacitorLike = { isNativePlatform?: () => boolean } | undefined;

/** 순수 판별부 — window/navigator 없이 값만 보고 결정(테스트 가능). */
export function isNativeAppFrom(
  userAgent: string,
  capacitor: CapacitorLike,
): boolean {
  if (userAgent.includes(NATIVE_UA_MARK)) return true;
  return typeof capacitor?.isNativePlatform === "function"
    ? capacitor.isNativePlatform()
    : false;
}

export function isNativeApp(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  return isNativeAppFrom(
    navigator.userAgent,
    (window as unknown as { Capacitor?: CapacitorLike }).Capacitor,
  );
}
