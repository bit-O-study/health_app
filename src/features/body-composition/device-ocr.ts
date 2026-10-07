"use client";

import type { OcrWord } from "@/features/body-composition/parse-body-comp-layout";

/**
 * 안드로이드 앱의 폰 안 글자 인식(BodyCompOcrPlugin · Google ML Kit 한국어).
 * 사진은 기기 밖으로 나가지 않고 AI 횟수도 쓰지 않는다. 플러그인이 있는 APK(1.0.6~)에서만 된다 —
 * 웹·옛 APK 는 없음으로 보고 직접 입력으로 안내한다.
 */
type BodyCompOcrPlugin = {
  recognize: (options: { base64: string }) => Promise<{ words: OcrWord[] }>;
};
type CapacitorLike = {
  isPluginAvailable?: (name: string) => boolean;
  Plugins?: { BodyCompOcr?: BodyCompOcrPlugin };
};

function capacitor(): CapacitorLike | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { Capacitor?: CapacitorLike }).Capacitor;
}

function plugin(): BodyCompOcrPlugin | undefined {
  const cap = capacitor();
  if (!cap) return undefined;
  if (typeof cap.isPluginAvailable === "function" && !cap.isPluginAvailable("BodyCompOcr")) return undefined;
  return cap.Plugins?.BodyCompOcr;
}

export function hasDeviceOcr(): boolean {
  return plugin() !== undefined;
}

export async function readTextOnDevice(base64: string): Promise<OcrWord[]> {
  const p = plugin();
  if (!p) throw new Error("이 기기에서는 사진 글자 읽기를 쓸 수 없어요.");
  const res = await p.recognize({ base64 });
  return Array.isArray(res?.words) ? res.words : [];
}
