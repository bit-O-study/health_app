/**
 * NVIDIA NIM(OpenAI 호환) 요청 바디 빌더 — 순수 로직(server-only 없음 → 테스트 가능).
 * 엔드포인트: https://integrate.api.nvidia.com/v1/chat/completions
 *
 * Llama 3.2 Vision NIM 은 이미지가 함께 있을 때 별도 system role 을 까다롭게 다루므로,
 * 이미지가 있으면 system 지시를 user 텍스트 앞에 접어 넣는다(품질 동일, 호환 안전).
 */

export type NvidiaImage = { base64: string; mediaType: string };

const ALLOWED_IMG = ["image/jpeg", "image/png", "image/webp", "image/gif"];

type OAContent =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

type OAMessage = { role: "system" | "user"; content: string | OAContent[] };

export type NvidiaBody = {
  model: string;
  max_tokens: number;
  temperature: number;
  messages: OAMessage[];
};

/** base64 + mediaType → OpenAI 비전용 data URI. 허용 외 타입은 jpeg 로 간주. */
export function imageDataUri(img: NvidiaImage): string {
  const mt = ALLOWED_IMG.includes(img.mediaType) ? img.mediaType : "image/jpeg";
  return `data:${mt};base64,${img.base64}`;
}

/** NVIDIA NIM chat/completions 바디를 만든다. images 가 있으면 비전 요청. */
export function buildNvidiaBody(
  model: string,
  system: string,
  userText: string,
  images: NvidiaImage[] = [],
  maxTokens = 900,
): NvidiaBody {
  const messages: OAMessage[] = [];
  if (images.length > 0) {
    // 이미지가 있으면 system 을 user 앞단에 접어 넣는다(비전 NIM 호환).
    const text = system ? `${system}\n\n${userText}` : userText;
    const content: OAContent[] = [{ type: "text", text }];
    for (const img of images) {
      content.push({ type: "image_url", image_url: { url: imageDataUri(img) } });
    }
    messages.push({ role: "user", content });
  } else {
    if (system) messages.push({ role: "system", content: system });
    messages.push({ role: "user", content: userText });
  }
  return { model, max_tokens: maxTokens, temperature: 0.2, messages };
}