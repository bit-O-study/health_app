"use server";

import Anthropic from "@anthropic-ai/sdk";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * 체성분 분석지 사진 → Claude Vision 으로 수치 추출.
 *
 * 환경변수 ANTHROPIC_API_KEY 가 있어야 동작한다. 없으면 UI 에서 버튼 자체가
 * 안 뜨게 처리(featureEnabled 헬퍼 사용).
 *
 * 비용: 보통 사진 1장당 ~$0.01–0.02 (Sonnet vision 기준).
 */

const BUCKET = "body-composition-images";

export type OcrField =
  | "weightKg"
  | "skeletalMuscleKg"
  | "bodyFatKg"
  | "bodyFatPct"
  | "muscleRightArm"
  | "muscleLeftArm"
  | "muscleTrunk"
  | "muscleRightLeg"
  | "muscleLeftLeg"
  | "fatRightArm"
  | "fatLeftArm"
  | "fatTrunk"
  | "fatRightLeg"
  | "fatLeftLeg";

export type OcrResult =
  | { ok: true; values: Partial<Record<OcrField, number>>; raw?: string }
  | { ok: false; error: string };

export async function isOcrEnabled(): Promise<boolean> {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const SYSTEM_PROMPT = `당신은 체성분 분석지(예: 한국 일반 체성분 분석 결과지) 사진을 보고 수치를 정확히 추출하는 보조 도구입니다.

규칙:
- 이미지에서 다음 항목의 숫자만 읽어 JSON 으로 반환합니다.
- 단위는 결과지에 적힌 그대로 (kg/% 변환 없음). 결과지에 없으면 그 키를 생략합니다.
- 신뢰가 낮으면(흐림·잘림·해석 모호) 그 키를 생략합니다 — 추측 금지.
- 부위별 근육량/체지방은 "ㄴ상지/ㄴ하지/체간/우상지/좌상지/우하지/좌하지" 등의 표를 보고 정확히 매핑.
- 결과는 반드시 JSON 객체 하나만, 다른 텍스트 없이.

반환 JSON 키 (모두 number, 해당 값이 없으면 키 자체를 생략):
- weightKg: 체중 (kg)
- skeletalMuscleKg: 골격근량 (kg)
- bodyFatKg: 체지방량 (kg)
- bodyFatPct: 체지방률 (%)
- muscleRightArm: 우상지 근육량 (kg)
- muscleLeftArm: 좌상지 근육량 (kg)
- muscleTrunk: 체간 근육량 (kg)
- muscleRightLeg: 우하지 근육량 (kg)
- muscleLeftLeg: 좌하지 근육량 (kg)
- fatRightArm: 우상지 체지방량 (kg)
- fatLeftArm: 좌상지 체지방량 (kg)
- fatTrunk: 체간 체지방량 (kg)
- fatRightLeg: 우하지 체지방량 (kg)
- fatLeftLeg: 좌하지 체지방량 (kg)`;

/** Storage 경로 → base64 + media type. 사용자 본인 파일만 접근 가능(RLS) */
async function loadImageBase64(
  imagePath: string,
): Promise<{ base64: string; mediaType: string } | { error: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };
  if (!imagePath.startsWith(`${user.id}/`)) {
    return { error: "이미지 경로가 올바르지 않습니다." };
  }

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(imagePath);
  if (error || !data) {
    return { error: error?.message ?? "이미지를 불러올 수 없습니다." };
  }

  const buf = Buffer.from(await data.arrayBuffer());
  if (buf.length > 10 * 1024 * 1024) {
    return { error: "이미지가 너무 큽니다 (10MB 초과)." };
  }
  const mediaType = data.type || "image/png";
  return { base64: buf.toString("base64"), mediaType };
}

function pickNumber(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^\d.\-]/g, ""));
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

const FIELDS: OcrField[] = [
  "weightKg",
  "skeletalMuscleKg",
  "bodyFatKg",
  "bodyFatPct",
  "muscleRightArm",
  "muscleLeftArm",
  "muscleTrunk",
  "muscleRightLeg",
  "muscleLeftLeg",
  "fatRightArm",
  "fatLeftArm",
  "fatTrunk",
  "fatRightLeg",
  "fatLeftLeg",
];

export async function extractBodyCompFromImageAction(
  imagePath: string,
): Promise<OcrResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "Claude API 키가 서버에 설정돼 있지 않습니다." };
  }

  const img = await loadImageBase64(imagePath);
  if ("error" in img) return { ok: false, error: img.error };

  const client = new Anthropic({ apiKey });

  try {
    const resp = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: img.mediaType as
                  | "image/png"
                  | "image/jpeg"
                  | "image/webp"
                  | "image/gif",
                data: img.base64,
              },
            },
            {
              type: "text",
              text: "이 체성분 분석지에서 읽을 수 있는 수치만 JSON 으로 반환해주세요. 추측 금지.",
            },
          ],
        },
      ],
    });

    const text = resp.content
      .filter((c): c is Anthropic.TextBlock => c.type === "text")
      .map((c) => c.text)
      .join("\n");

    // JSON 코드 펜스 / 부가 텍스트가 섞일 수 있어 첫 { ... } 추출
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) {
      return {
        ok: false,
        error: "응답에서 JSON 을 찾지 못했습니다. 사진이 흐리거나 인식이 어려운 형식일 수 있어요.",
      };
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(m[0]) as Record<string, unknown>;
    } catch {
      return { ok: false, error: "응답 JSON 파싱 실패." };
    }

    const values: Partial<Record<OcrField, number>> = {};
    for (const f of FIELDS) {
      const v = pickNumber(parsed[f]);
      if (v !== undefined) values[f] = v;
    }

    if (Object.keys(values).length === 0) {
      return {
        ok: false,
        error: "분석지에서 인식된 수치가 없습니다. 사진을 더 선명하게 다시 찍어보세요.",
      };
    }

    return { ok: true, values, raw: text };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Claude 호출 실패: ${msg}` };
  }
}
