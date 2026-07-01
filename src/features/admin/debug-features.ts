/**
 * 디버그 기능 레지스트리 — 순수 모듈(server-only 없음 → 단위 테스트 가능).
 * DB 접근이 필요한 게이트 함수는 `debug-features.server.ts` 에 있다.
 *
 * 🔴 새 디버그(개발/진단) 기능을 만들 때는 아래 DEBUG_FEATURES 에 { id, label } 로
 *    등록하고, 노출부에서 `isDebugFeatureEnabled(id)`(server 파일)로 게이트한다.
 *    그러면 관리자 설정(/admin/settings)에 '기능별 온오프' 토글이 자동으로 생기고,
 *    디버그 계정(관리자)에게만, 켜진 기능만 보인다. 자세한 규칙은 docs/DEBUG-FEATURES.md.
 */
export const DEBUG_FEATURES = [
  {
    id: "steps",
    label: "걸음수 진단칩(🩺 앱UA·브릿지·플러그인·권한·레코드…)",
  },
  {
    id: "equipment-scan",
    label: "기구 사진 분석(📷 기구 식별 + 가능한 운동, Claude 비전)",
  },
] as const;

export type DebugFeatureId = (typeof DEBUG_FEATURES)[number]["id"];

export const debugSettingKey = (id: string) => `debug.${id}`;

/**
 * 저장된 app_settings 값을 '켜짐 여부'로 해석한다.
 * 기본은 켜짐 — 명시적으로 false 를 기록한 경우에만 꺼짐(미설정/null/그 외 = 켜짐).
 */
export function debugValueEnabled(value: unknown): boolean {
  return value !== false;
}
