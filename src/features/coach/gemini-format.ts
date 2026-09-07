/**
 * Google Gemini `generateContent` 요청 바디 빌더 — 순수 로직(server-only 없음 → 테스트 가능).
 * 엔드포인트: https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
 *
 * ## 왜 provider 를 하나 더 두나
 * 지금 기본은 NVIDIA NIM(Llama 3.2 Vision) 무료 티어다. 두 가지가 아쉽다 —
 * ① 한국어 응답 품질이 들쭉날쭉하고, ② **요청당 이미지 1장**에 맞춰져 있어 자세 분석이
 * 프레임 4장을 2×2 격자 **한 장으로 이어붙여** 보낸다(칸마다 해상도가 1/4 로 준다).
 * Gemini 무료 티어는 카드 없이 멀티모달을 그대로 주고 **여러 장을 따로** 받는다.
 *
 * NVIDIA 를 걷어내지는 않는다. 무료 티어는 언제든 한도·정책이 바뀌는 자리라
 * **갈아탈 수 있게** 두는 것 자체가 값이다(`ai.ts` 가 키 유무로 고른다).
 */

export type GeminiImage = { base64: string; mediaType: string };

const ALLOWED_IMG = ["image/jpeg", "image/png", "image/webp", "image/gif"];

type Part = { text: string } | { inlineData: { mimeType: string; data: string } };

export type GeminiBody = {
  contents: { role: "user"; parts: Part[] }[];
  systemInstruction?: { parts: { text: string }[] };
  generationConfig: { maxOutputTokens: number; temperature: number };
};

/** 허용 외 타입은 jpeg 로 간주 — 카메라·업로드에서 드물게 엉뚱한 값이 온다. */
export function imageMimeType(img: GeminiImage): string {
  return ALLOWED_IMG.includes(img.mediaType) ? img.mediaType : "image/jpeg";
}

/**
 * 바디를 만든다.
 *
 * NVIDIA 와 달리 **system 을 접어 넣지 않는다** — Gemini 는 `systemInstruction` 을
 * 이미지가 있든 없든 똑같이 받는다. 이미지는 텍스트 **앞**에 둔다(먼저 보고 나서
 * 지시를 읽는 순서가 비전 품질에 낫다는 게 두 provider 에서 공통이다).
 */
export function buildGeminiBody(
  system: string,
  userText: string,
  images: GeminiImage[] = [],
  maxTokens = 900,
): GeminiBody {
  const parts: Part[] = [];
  for (const img of images) {
    parts.push({ inlineData: { mimeType: imageMimeType(img), data: img.base64 } });
  }
  parts.push({ text: userText });

  const body: GeminiBody = {
    contents: [{ role: "user", parts }],
    generationConfig: { maxOutputTokens: maxTokens, temperature: 0.2 },
  };
  // 빈 시스템 프롬프트로 호출하는 자리가 있다(기구 인식). 빈 문자열을 넣으면
  // 400 이 나므로 아예 키를 안 만든다.
  if (system) body.systemInstruction = { parts: [{ text: system }] };
  return body;
}

/**
 * 응답에서 텍스트를 꺼낸다.
 *
 * 조각(part)이 여러 개로 쪼개져 올 수 있어 **이어 붙인다** — 첫 조각만 읽으면 긴 답이
 * 중간에서 잘리고, 그게 JSON 이면 파싱이 실패해 "이해하지 못했어요" 로 떨어진다.
 */
export function parseGeminiText(data: unknown): string {
  const parts = (
    data as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    } | null
  )?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .map((p) => p?.text ?? "")
    .join("")
    .trim();
}
