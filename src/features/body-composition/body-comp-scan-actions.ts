"use server";

import { callAI } from "@/features/coach/ai";
import { consumeAiQuota } from "@/features/coach/ai-usage";
import {
  parseBodyCompScan,
  type OcrField,
} from "@/features/body-composition/parse-body-comp";

export type BodyCompScanResult =
  | { ok: true; values: Partial<Record<OcrField, number>> }
  | { ok: false; error: string };

const SYSTEM = `너는 인바디(InBody) 같은 체성분 분석지 사진을 읽는 판독기다. 사진 속 숫자를 정확히 읽어 아래 JSON 하나만 출력한다(설명·코드펜스 없이). 못 읽은 값은 null.
{"weightKg":숫자|null,"skeletalMuscleKg":숫자|null,"bodyFatKg":숫자|null,"bodyFatPct":숫자|null,"muscleRightArm":숫자|null,"muscleLeftArm":숫자|null,"muscleTrunk":숫자|null,"muscleRightLeg":숫자|null,"muscleLeftLeg":숫자|null,"fatRightArm":숫자|null,"fatLeftArm":숫자|null,"fatTrunk":숫자|null,"fatRightLeg":숫자|null,"fatLeftLeg":숫자|null}
규칙:
- weightKg=체중(kg), skeletalMuscleKg=골격근량(kg), bodyFatKg=체지방량(kg), bodyFatPct=체지방률(%).
- muscle*=부위별 근육량(kg), fat*=부위별 체지방(kg).
  RightArm=우상지/오른팔, LeftArm=좌상지/왼팔, Trunk=체간/몸통, RightLeg=우하지/오른다리, LeftLeg=좌하지/왼다리.
- 값은 단위 없이 숫자만. 표에서 해당 칸이 안 보이면 null.`;

/**
 * 체성분(인바디) 분석지 사진 1장 → AI 비전으로 14개 수치 추출.
 * 기존 브라우저 Tesseract OCR(WebView에서 실패)을 대체한다. 식단 스캔과 동일한 callAI 경로.
 */
export async function scanBodyCompPhotoAction(input: {
  imageBase64: string;
  mediaType: string;
}): Promise<BodyCompScanResult> {
  if (!input.imageBase64) return { ok: false, error: "사진이 없습니다." };

  const quota = await consumeAiQuota("body-scan");
  if (!quota.ok) return { ok: false, error: quota.message };

  const res = await callAI(SYSTEM, "이 체성분 분석지의 수치를 읽어줘.", {
    images: [{ base64: input.imageBase64, mediaType: input.mediaType }],
    maxTokens: 700,
  });
  if (!res.ok) return { ok: false, error: res.error };

  return { ok: true, values: parseBodyCompScan(res.text) };
}
