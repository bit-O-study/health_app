/**
 * 네이티브 → 웹으로 **복구 상태를 건네받는 방식** — 로드맵 1.1.
 *
 * WebView 렌더러가 죽으면 안드로이드가 새 WebView 로 다시 띄운다. 그때 "방금 죽어서
 * 다시 켠 것인지", "짧은 시간에 몇 번이나 죽었는지" 를 네이티브가 알려 준다
 * (`MainActivity` 의 `HelssuNative` 브리지). 웹은 그 값을 보고 **위험한 화면 대신
 * 안전한 홈으로** 보낸다 — 안 그러면 죽던 화면으로 돌아가 또 죽는 고리에 갇힌다.
 *
 * 🔴 여기서 제일 중요한 건 **옛 APK 호환**이다. 브리지는 두 번에 걸쳐 늘어났다.
 *  - 처음: `consumeRendererRecovery()` → boolean (죽었다 살아났나)
 *  - 나중: `consumeRendererRecoveryCount()` → number (몇 번이나)
 * 사용자는 앱을 바로 업데이트하지 않는다. 새 함수만 찾고 없으면 0 으로 처리하면,
 * **옛 APK 에서는 반복 종료를 영영 못 알아채고** 죽는 고리를 그대로 돈다.
 * 그래서 새 것 → 옛 것 → 0 순서로 내려간다.
 *
 * 값은 **한 번만** 온다(네이티브가 읽는 즉시 지운다). 그래서 이 함수를 두 번 부르면
 * 두 번째는 0 이다 — 호출부는 부팅당 한 번만 불러야 한다.
 */

/** 네이티브가 심어 주는 브리지 중 복구에 쓰는 부분만. */
export type RendererRecoveryBridge = {
  /** 새 APK — 2분 안에 이어진 복구 횟수. */
  consumeRendererRecoveryCount?: () => number;
  /** 옛 APK — 복구 부팅인지 여부만. */
  consumeRendererRecovery?: () => boolean;
};

/**
 * 브리지에서 복구 횟수를 읽는다. 못 읽으면 **0**(= 평범한 부팅).
 *
 * 0 으로 떨어지는 게 안전한 쪽인 이유: 복구가 아닌데 복구로 착각하면 사용자가 보던
 * 화면을 빼앗고 홈으로 보낸다. 반대(복구인데 못 알아챔)는 원래 하던 대로 두는 것이라
 * 덜 나쁘다.
 */
export function readRecoveryCount(
  bridge: RendererRecoveryBridge | null | undefined,
): number {
  if (!bridge) return 0;
  try {
    const n = bridge.consumeRendererRecoveryCount?.();
    if (typeof n === "number" && Number.isFinite(n)) {
      // 음수·소수는 브리지가 잘못 준 값이다 — 0 아래로는 안 내려간다.
      return Math.max(0, Math.floor(n));
    }
    // 옛 APK 폴백 — 횟수는 모르지만 '복구 부팅' 이라는 사실은 안다.
    return bridge.consumeRendererRecovery?.() === true ? 1 : 0;
  } catch {
    // 브리지가 던지면(주입 실패·버전 불일치) 앱을 막을 이유가 없다.
    return 0;
  }
}
