import "server-only";

import { callAI } from "@/features/coach/ai";
import { consumeAiQuota } from "@/features/coach/ai-usage";
import { parseVisionResult, type VisionResult } from "@/features/equipment/parse";

export type VisionCall =
  | { ok: true; result: VisionResult }
  | { ok: false; error: string };

const PROMPT = `이 사진은 헬스장/운동 기구 사진이다. 아래 JSON 스키마로만 답하라(설명·코드펜스 없이 JSON 객체 하나만).

{
  "equipmentName": "기구 이름(한국어)",
  "equipmentNameEn": "equipment name (English)",
  "confidence": "high | medium | low",
  "summary": "이 기구가 무엇이고 어떻게 쓰는지 1~2문장(한국어)",
  "muscles": ["주로 자극되는 근육(한국어)", "..."],
  "exercises": [
    { "name": "이 기구로 할 수 있는 운동 이름(한국어)", "description": "수행법 한 문장(한국어)" }
  ]
}

규칙:
- exercises 는 3~6개, 대표적인 것부터.
- 운동 이름은 한국 헬스장에서 흔히 쓰는 표준 명칭으로(예: 레그프레스, 랫풀다운, 체스트프레스).
- 사진이 운동기구가 아니거나 불확실하면 confidence 를 "low" 로 하고 summary 에 이유를 적어라.`;

/**
 * 이미지(base64)를 AI 비전에 보내 기구 분석 결과를 받는다.
 * provider 는 callAI 가 자동 선택(NVIDIA 무료 우선, 없으면 Claude).
 */
export async function analyzeEquipmentImage(
  imageBase64: string,
  mediaType: string,
): Promise<VisionCall> {
  const quota = await consumeAiQuota("equipment-scan");
  if (!quota.ok) return { ok: false, error: quota.message };

  const res = await callAI("", PROMPT, {
    images: [{ base64: imageBase64, mediaType }],
    maxTokens: 800,
  });
  if (!res.ok) return { ok: false, error: res.error };

  const parsed = parseVisionResult(res.text);
  if (!parsed) {
    return { ok: false, error: "분석 결과를 이해하지 못했어요. 다시 시도해 주세요." };
  }
  return { ok: true, result: parsed };
}
