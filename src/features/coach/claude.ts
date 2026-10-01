import "server-only";

/** 헬쑤쌤 공용 Claude 호출(텍스트·이미지). ANTHROPIC_API_KEY 필요. */

const MODEL = "claude-haiku-4-5-20251001";
const API_URL = "https://api.anthropic.com/v1/messages";

export type ClaudeResult = { ok: true; text: string } | { ok: false; error: string };

export type ImageInput = { base64: string; mediaType: string };

type Block =
  | { type: "text"; text: string }
  | {
      type: "image";
      source: { type: "base64"; media_type: string; data: string };
    };

const ALLOWED_IMG = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/**
 * Claude 에 시스템 프롬프트 + 유저 텍스트(+선택 이미지들)를 보내 텍스트 응답을 받는다.
 * 이미지가 있으면 비전으로 처리(자세 분석 등).
 */
export async function callClaude(
  system: string,
  userText: string,
  opts: { images?: ImageInput[]; maxTokens?: number } = {},
): Promise<ClaudeResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error: "서버에 ANTHROPIC_API_KEY 가 설정되지 않았습니다(관리자 설정 필요).",
    };
  }

  const content: Block[] = [];
  for (const img of opts.images ?? []) {
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: ALLOWED_IMG.includes(img.mediaType)
          ? img.mediaType
          : "image/jpeg",
        data: img.base64,
      },
    });
  }
  content.push({ type: "text", text: userText });

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
        max_tokens: opts.maxTokens ?? 900,
        system,
        messages: [{ role: "user", content }],
      }),
    });
  } catch (e) {
    return { ok: false, error: `요청 실패: ${(e as Error).message}` };
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, error: `AI 서버 오류(${res.status}). ${body.slice(0, 200)}` };
  }
  const data = (await res.json().catch(() => null)) as {
    content?: { type: string; text?: string }[];
  } | null;
  const text = data?.content?.find((c) => c.type === "text")?.text ?? "";
  if (!text) return { ok: false, error: "AI 응답이 비어 있어요. 다시 시도해 주세요." };
  return { ok: true, text };
}
