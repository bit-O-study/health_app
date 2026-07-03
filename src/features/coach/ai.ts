import "server-only";

import { callClaude, type ClaudeResult, type ImageInput } from "@/features/coach/claude";
import { buildNvidiaBody } from "@/features/coach/nvidia-format";

/**
 * 공용 AI 호출 계층 — provider 교체 가능.
 * `NVIDIA_API_KEY` 가 있으면 무료 NVIDIA NIM(Llama 3.2 Vision, OpenAI 호환)으로,
 * 없으면 Anthropic Claude 로 폴백한다. 반환 형태({ok,text})는 동일해서 호출부는 그대로.
 *
 * 참고: NVIDIA 무료 티어는 개발·평가용(분당 40요청, 실서비스는 Enterprise 필요)이며
 * Llama Vision NIM 은 요청당 이미지 1장에 최적화돼 있다(다중 프레임은 첫 장 위주).
 */

const NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const DEFAULT_NVIDIA_MODEL = "meta/llama-3.2-90b-vision-instruct";

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

/** 시스템 프롬프트 + 유저 텍스트(+선택 이미지)로 텍스트 응답을 받는다(provider 자동 선택). */
export async function callAI(
  system: string,
  userText: string,
  opts: { images?: ImageInput[]; maxTokens?: number } = {},
): Promise<AIResult> {
  if (process.env.NVIDIA_API_KEY) return callNvidia(system, userText, opts);
  return callClaude(system, userText, opts);
}