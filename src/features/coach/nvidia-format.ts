/**
 * NVIDIA NIM(OpenAI 호환) 요청 바디 빌더 — 순수 로직(server-only 없음 → 테스트 가능).
 * 엔드포인트: https://integrate.api.nvidia.com/v1/chat/completions
 *
 * 비전 NIM 은 이미지가 함께 있을 때 별도 system role 을 까다롭게 다루므로,
 * 이미지가 있으면 system 지시를 user 텍스트 앞에 접어 넣는다(품질 동일, 호환 안전).
 */

export type NvidiaImage = { base64: string; mediaType: string };

/**
 * 기본 모델 — 2026-09-30 실측(무료 키로 같은 질문):
 *  - 글: `nemotron-3-super-120b-a12b` — 0.8~4초, 한국어·JSON 이 가장 자연스럽다.
 *  - 사진: `nemotron-3-nano-omni-30b-a3b-reasoning` — 1.9초, 사진을 정확히 읽는다.
 *  - 예전 기본 `llama-3.2-90b-vision` 은 120초 넘게 무응답, `llama-3.2-11b-vision` 은 위스키를
 *    소주로 읽고 JSON 을 안 지켰다. 목록에 있어도 404 인 모델이 많다(gemma-3·mistral-large 등).
 * 환경변수 `NVIDIA_MODEL`(글) · `NVIDIA_VISION_MODEL`(사진)로 바꿀 수 있다.
 */
export const NVIDIA_TEXT_MODEL = "nvidia/nemotron-3-super-120b-a12b";
export const NVIDIA_VISION_MODEL = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning";

/** 사진이 있으면 사진 모델, 없으면 글 모델. 환경변수가 있으면 그걸 쓴다. */
export function pickNvidiaModel(
  hasImages: boolean,
  env: { NVIDIA_MODEL?: string; NVIDIA_VISION_MODEL?: string } = {},
): string {
  return hasImages
    ? env.NVIDIA_VISION_MODEL || NVIDIA_VISION_MODEL
    : env.NVIDIA_MODEL || NVIDIA_TEXT_MODEL;
}

/**
 * Nemotron 3 계열은 기본으로 '생각 과정'을 답에 섞는다("We need to respond..."). 앱은 JSON 만
 * 읽으므로 끈다(`enable_thinking: false`) — 속도도 빨라진다.
 */
export function isThinkingModel(model: string): boolean {
  return /nemotron-3/i.test(model);
}

/** 혹시 남은 <think>…</think> 는 걷어낸다(모델·설정이 바뀌어도 JSON 읽기가 깨지지 않게). */
export function cleanNvidiaText(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

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
  chat_template_kwargs?: { enable_thinking: boolean };
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
  const body: NvidiaBody = { model, max_tokens: maxTokens, temperature: 0.2, messages };
  if (isThinkingModel(model)) body.chat_template_kwargs = { enable_thinking: false };
  return body;
}

export type AiProvider = "nvidia" | "gemini" | "claude";

/**
 * 부를 순서 — 키가 있는 것만, NVIDIA → Gemini → Claude(2026-09-30 사용자 결정: NVIDIA 우선).
 * 앞이 실패하면 `callAI` 가 다음으로 넘어간다. 유료(Claude)는 무료 둘이 다 실패할 때만.
 */
export function aiProviderOrder(keys: { nvidia: boolean; gemini: boolean; claude: boolean }): AiProvider[] {
  return (["nvidia", "gemini", "claude"] as const).filter((p) => keys[p]);
}

/** 사진 모델이 막혔을 때 쓸 두 번째 사진 모델 — 품질은 낮지만(위스키를 소주로 읽음) 빈손보다 낫다. */
export const NVIDIA_VISION_FALLBACK = "meta/llama-3.2-11b-vision-instruct";

/**
 * 첫 모델이 과부하·한도·시간 초과일 때 한 번 더 부를 모델. 같은 모델이면 null.
 * 글은 사진 모델(Nano Omni)로도 잘 답한다(실측) — 빠르고 가벼워 과부하가 덜하다.
 */
export function nvidiaFallbackModel(model: string, hasImages: boolean): string | null {
  const next = hasImages ? NVIDIA_VISION_FALLBACK : NVIDIA_VISION_MODEL;
  return next === model ? null : next;
}

/** 다시 부를 만한 실패인가 — 과부하·한도·서버 쪽 오류만. 400·401·404 는 다시 불러도 같다. */
export function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}
