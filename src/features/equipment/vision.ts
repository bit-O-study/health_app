import "server-only";

import { parseVisionResult, type VisionResult } from "@/features/equipment/parse";

/** 비용/정확도 균형 — 기구 식별엔 Haiku 4.5 로 충분(장당 수 원). */
const MODEL = "claude-haiku-4-5-20251001";
const API_URL = "https://api.anthropic.com/v1/messages";

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
 * 이미지(base64)를 Claude 비전에 보내 기구 분석 결과를 받는다.
 * ANTHROPIC_API_KEY 가 없으면 실패를 반환(친절한 안내 메시지).
 */
export async function analyzeEquipmentImage(
  imageBase64: string,
  mediaType: string,
): Promise<VisionCall> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error: "서버에 ANTHROPIC_API_KEY 가 설정되지 않았습니다(관리자 설정 필요).",
    };
  }
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const mt = allowed.includes(mediaType) ? mediaType : "image/jpeg";

  let res: Response;
  try {
    res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 800,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mt, data: imageBase64 },
              },
              { type: "text", text: PROMPT },
            ],
          },
        ],
      }),
    });
  } catch (e) {
    return { ok: false, error: `분석 요청 실패: ${(e as Error).message}` };
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return {
      ok: false,
      error: `분석 서버 오류(${res.status}). ${body.slice(0, 200)}`,
    };
  }

  const data = (await res.json().catch(() => null)) as {
    content?: { type: string; text?: string }[];
  } | null;
  const text =
    data?.content?.find((c) => c.type === "text")?.text ?? "";
  const parsed = parseVisionResult(text);
  if (!parsed) {
    return { ok: false, error: "분석 결과를 이해하지 못했어요. 다시 시도해 주세요." };
  }
  return { ok: true, result: parsed };
}
