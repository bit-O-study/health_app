/**
 * 지금 네이티브 앱(APK WebView) 안인지 판별 — 클라이언트 전용, 동기.
 * UA 표식(helssu-app, config 와 일치) 또는 Capacitor 브릿지 주입 여부로 본다.
 * (group-controls·steps-native 의 in-app 판별과 동일 기준.)
 *
 * ⚠️ SSR 에선 window 가 없어 false 를 준다. 렌더 중 직접 쓰면 하이드레이션 불일치가
 * 날 수 있으니, useState(false)+useEffect 로 마운트 후 세팅해서 쓴다.
 */
const NATIVE_UA_MARK = "helssu-app";

export function isNativeApp(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  if (navigator.userAgent.includes(NATIVE_UA_MARK)) return true;
  return !!(window as unknown as { Capacitor?: unknown }).Capacitor;
}
