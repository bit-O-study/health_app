/**
 * 네이티브(안드로이드 WebView) 브릿지 — 웹에서 OS 설정 화면을 여는 얇은 래퍼.
 *
 * MainActivity 가 `window.HelssuNative` JS 인터페이스를 심어두면 사용 가능.
 * 인터페이스가 없으면(웹 브라우저 등) false 를 돌려주니 호출측이 안내로 폴백한다.
 *
 * ⚠ 웹/WebView 에서 기기 GPS(위치정보)를 코드로 '자동 ON' 할 수는 없다(OS 보안 제약).
 * 할 수 있는 건 "위치 설정 화면을 열어주는" 것까지 — 실제 토글은 사용자가 한 번 누른다.
 * (완전 자동 ON 은 네이티브 Play Services 의 위치설정 요청 다이얼로그가 필요하다.)
 */

type NativeBridge = {
  openLocationSettings?: () => void;
  openAppSettings?: () => void;
};

function bridge(): NativeBridge | null {
  if (typeof window === "undefined") return null;
  const b = (window as unknown as { HelssuNative?: NativeBridge }).HelssuNative;
  return b ?? null;
}

/** 네이티브 앱(브릿지 존재) 환경인지. */
export function hasNativeBridge(): boolean {
  return bridge() !== null;
}

/** 기기 '위치 정보' 설정 화면 열기. 성공 시 true. */
export function openLocationSettings(): boolean {
  const b = bridge();
  if (b?.openLocationSettings) {
    try {
      b.openLocationSettings();
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

/** 이 앱의 권한 설정 화면 열기(권한 영구거부 시 안내용). 성공 시 true. */
export function openAppSettings(): boolean {
  const b = bridge();
  if (b?.openAppSettings) {
    try {
      b.openAppSettings();
      return true;
    } catch {
      return false;
    }
  }
  return false;
}