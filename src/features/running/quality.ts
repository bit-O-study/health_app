/**
 * 3D 런닝 씬 품질 자동 조절 — 순수 모듈(테스트 가능).
 *
 * 팅김(앱 강제종료)은 중저가 폰에서 3D 씬 + 카메라 + 얼굴추론이 동시에 돌 때 났다.
 * 기기 성능을 보고 **저사양이면 그림자를 끄고 해상도를 더 낮춘다**. 고사양은 그대로.
 *
 * 판정 신호(안드로이드 WebView·크롬에서 제공):
 * - `navigator.deviceMemory` — GB 단위(0.25~8 로 반올림돼 옴). 8 이 상한이라 8 = "8 이상".
 * - `navigator.hardwareConcurrency` — 논리 코어 수.
 * 둘 다 없으면(iOS 사파리 등) **중간 등급**으로 본다 — 모르면 안전한 쪽.
 */

import { detectLightMode } from "@/features/performance/light-mode";

export type SceneTier = "low" | "mid" | "high";

export type SceneQuality = {
  tier: SceneTier;
  /** 그림자 렌더 여부. 저사양은 끈다(그림자 패스가 매 프레임 통째로 사라진다). */
  shadows: boolean;
  /** 그림자 맵 한 변 픽셀. shadows=false 면 안 쓰인다. */
  shadowMapSize: number;
  /** Canvas dpr 상한. 렌더 픽셀 수를 좌우하는 가장 큰 손잡이. */
  dprMax: number;
};

export const QUALITY: Record<SceneTier, SceneQuality> = {
  low: { tier: "low", shadows: false, shadowMapSize: 512, dprMax: 1 },
  mid: { tier: "mid", shadows: true, shadowMapSize: 512, dprMax: 1.5 },
  high: { tier: "high", shadows: true, shadowMapSize: 1024, dprMax: 1.5 },
};

export type DeviceHints = {
  /** navigator.deviceMemory (GB). 미지원이면 null. */
  deviceMemory?: number | null;
  /** navigator.hardwareConcurrency. 미지원이면 null. */
  cores?: number | null;
};

/**
 * 기기 신호 → 품질 등급.
 *
 * - **low**: 메모리 4GB 미만 **또는** 코어 4개 이하. 중저가·구형 폰이 여기 걸린다.
 * - **high**: 메모리 8GB 이상 **그리고** 코어 8개 이상.
 * - 그 사이 + 신호가 아예 없는 기기는 **mid**.
 *
 * "또는/그리고"가 비대칭인 건 일부러다 — 팅기는 쪽 비용이 훨씬 크니 저사양 판정은
 * 넉넉하게(하나만 걸려도 low), 고사양 판정은 인색하게 한다.
 */
export function pickSceneQuality(hints: DeviceHints = {}): SceneQuality {
  const mem = typeof hints.deviceMemory === "number" ? hints.deviceMemory : null;
  const cores = typeof hints.cores === "number" ? hints.cores : null;

  if ((mem !== null && mem < 4) || (cores !== null && cores <= 4)) {
    return QUALITY.low;
  }
  if (mem !== null && mem >= 8 && cores !== null && cores >= 8) {
    return QUALITY.high;
  }
  return QUALITY.mid;
}

/** 브라우저에서 신호를 읽어 품질을 고른다. SSR·미지원이면 mid. */
export function detectSceneQuality(): SceneQuality {
  if (typeof navigator === "undefined") return QUALITY.mid;
  if (detectLightMode()) return QUALITY.low;
  const nav = navigator as Navigator & { deviceMemory?: number };
  return pickSceneQuality({
    deviceMemory: typeof nav.deviceMemory === "number" ? nav.deviceMemory : null,
    cores:
      typeof nav.hardwareConcurrency === "number"
        ? nav.hardwareConcurrency
        : null,
  });
}
