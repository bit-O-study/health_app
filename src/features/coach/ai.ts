import "server-only";

import { callClaude, type ClaudeResult, type ImageInput } from "@/features/coach/claude";
import { buildNvidiaBody } from "@/features/coach/nvidia-format";
import { buildGeminiBody, parseGeminiText } from "@/features/coach/gemini-format";

/**
 * 공용 AI 호출 계층 — provider 교체 가능. 반환 형태({ok,text})가 같아 호출부는 그대로다.
 *
 * ## 고르는 순서 — 키가 있는 것 중 위에서부터
 * 1. **Gemini**(`GEMINI_API_KEY`) — 무료 티어가 카드 없이 멀티모달을 그대로 준다.
 *    한국어가 낫고 **이미지를 여러 장** 받는다(아래 참고).
 * 2. **NVIDIA NIM**(`NVIDIA_API_KEY`) — 무료. Llama 3.2 Vision.
 * 3. **Claude**(`ANTHROPIC_API_KEY`) — 유료. 위 둘이 없을 때.
 *
 * 셋 다 남겨 두는 이유는 무료 티어가 **언제든 한도·정책이 바뀌는 자리**라서다.
 * 하나가 막혀도 환경변수 하나로 갈아탄다.
 *
 * ## 무료 티어의 한계 (2026-09 기준)
 * - NVIDIA: 개발·평가용, 분당 40요청. Vision NIM 은 **요청당 이미지 1장**에 맞춰져 있어
 *   자세 분석이 프레임 4장을 2×2 격자 한 장으로 이어붙여 보낸다(칸당 해상도 1/4).
 * - Gemini: 모델별로 분당 요청수·일일 요청수 제한. 여러 장을 따로 보낼 수 있으므로,
 *   ⚠ **격자 합성을 걷어내는 건 별도 작업이다** — 합치는 코드가 서버가 아니라
 *   화면(`posture-analyzer.tsx`)에 있어서 여기만 바꿔서는 효과가 없다.
 */

const NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const DEFAULT_NVIDIA_MODEL = "meta/llama-3.2-90b-vision-instruct";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models";
/** 무료 티어에서 일일 한도가 가장 넉넉한 축이면서 비전을 받는 모델. */
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

export type { ImageInput };
export type AIResult = ClaudeResult;

async function callNvidia(
  system: string,
  userText: string,
  opts: { images?: ImageInput[]; maxTokens?: number },
): Promise<AIResult> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error: "서버에 NVIDIA_API_KEY 가 설정되지 않았습니다(관리자 설정 필요).",
    };
  }
  const model = process.env.NVIDIA_MODEL || DEFAULT_NVIDIA_MODEL;
  const body = buildNvidiaBody(
    model,
    system,
    userText,
    (opts.images ?? []).map((i) => ({ base64: i.base64, mediaType: i.mediaType })),
    opts.maxTokens ?? 900,
  );

  let res: Response;
  try {
    res = await fetch(NVIDIA_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    return { ok: false, error: `요청 실패: ${(e as Error).message}` };
  }
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    return { ok: false, error: `AI 서버 오류(${res.status}). ${t.slice(0, 200)}` };
  }
  const data = (await res.json().catch(() => null)) as {
    choices?: { message?: { content?: string } }[];
  } | null;
  const text = data?.choices?.[0]?.message?.content ?? "";
  if (!text) return { ok: false, error: "AI 응답이 비어 있어요. 다시 시도해 주세요." };
  return { ok: true, text };
}

async function callGemini(
  system: string,
  userText: string,
  opts: { images?: ImageInput[]; maxTokens?: number },
): Promise<AIResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error: "서버에 GEMINI_API_KEY 가 설정되지 않았습니다(관리자 설정 필요).",
    };
  }
  const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const body = buildGeminiBody(
    system,
    userText,
    (opts.images ?? []).map((i) => ({ base64: i.base64, mediaType: i.mediaType })),
    opts.maxTokens ?? 900,
  );

  let res: Response;
  try {
    // 🔴 키는 쿼리스트링이 아니라 헤더로. URL 은 로그·프록시에 그대로 남는다.
    res = await fetch(`${GEMINI_URL}/${model}:generateContent`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    return { ok: false, error: `요청 실패: ${(e as Error).message}` };
  }
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    return { ok: false, error: `AI 서버 오류(${res.status}). ${t.slice(0, 200)}` };
  }
  const text = parseGeminiText(await res.json().catch(() => null));
  if (!text) return { ok: false, error: "AI 응답이 비어 있어요. 다시 시도해 주세요." };
  return { ok: true, text };
}

/** 시스템 프롬프트 + 유저 텍스트(+선택 이미지)로 텍스트 응답을 받는다(provider 자동 선택). */
export async function callAI(
  system: string,
  userText: string,
  opts: { images?: ImageInput[]; maxTokens?: number } = {},
): Promise<AIResult> {
  if (process.env.GEMINI_API_KEY) return callGemini(system, userText, opts);
  if (process.env.NVIDIA_API_KEY) return callNvidia(system, userText, opts);
  return callClaude(system, userText, opts);
}