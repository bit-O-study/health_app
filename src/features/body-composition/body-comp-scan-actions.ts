"use server";

import { callAI } from "@/features/coach/ai";
import { consumeAiQuota, refundAiQuota } from "@/features/coach/ai-usage";
import {
  parseLabeledBodyCompScan,
  checkBodyCompScan,
  type OcrField,
} from "@/features/body-composition/parse-body-comp";

export type BodyCompScanResult =
  | { ok: true; values: Partial<Record<OcrField, number>>; warnings: string[] }
  | { ok: false; error: string };

const SYSTEM = `인바디 체성분 결과지의 현재 측정값을 읽는다. 응답은 JSON 객체 하나만 출력한다.
허용 키: weightKg, skeletalMuscleKg, bodyFatKg, bodyFatPct, muscleRightArm, muscleLeftArm, muscleTrunk, muscleRightLeg, muscleLeftLeg, fatRightArm, fatLeftArm, fatTrunk, fatRightLeg, fatLeftLeg.
각 값은 null 또는 {"value":숫자,"label":"사진에 실제 인쇄된 항목명","unit":"kg 또는 %","section":"실제 인쇄된 구역 제목"}이다. section은 부위별 값에 필수다. label을 출력 키에 맞춰 바꿔 쓰지 말고 원문을 옮겨라.
- weightKg: 반드시 체중/Weight/Body Weight 행의 kg 측정값만 읽는다. 체수분/Total Body Water/TBW(L), 단백질, 무기질, 제지방량, 적정체중, 체중조절, 과거 측정 이력은 체중이 아니다. 행이 확실하지 않으면 null.
- skeletalMuscleKg: 골격근량/Skeletal Muscle Mass/SMM kg.
- bodyFatKg: 체지방량/Body Fat Mass kg. bodyFatPct: 체지방률/Percent Body Fat/PBF %.
- muscle*: 부위별근육량/부위별근육분석/Segmental Lean Analysis 구역의 kg 값.
- fat*: 부위별체지방/부위별체지방분석/Segmental Fat Analysis 구역의 kg 값.
- RightArm=우상지/오른팔/Right Arm, LeftArm=좌상지/왼팔/Left Arm, Trunk=체간/몸통/Trunk, RightLeg=우하지/오른다리/Right Leg, LeftLeg=좌하지/왼다리/Left Leg.
- InBody 270 계열처럼 부위별 결과가 표준/표준이상/표준이하 등의 판정만 있고 수치가 없으면 해당 부위 값은 모두 null이다. 판정을 kg 수치로 환산하지 않는다.
- 체성분변화/Body Composition History의 과거 값, 체중조절/Weight Control의 적정체중은 현재 체중이 아니다. 현재 골격근·지방분석의 Weight/체중, SMM/골격근량, Body Fat Mass/체지방량 행의 막대 끝 측정값과 비만분석의 PBF/체지방률 값을 확인한다.
- 표준범위, 그래프 눈금, 백분율을 kg로 옮기지 않는다. 항목명·실제 측정값·단위를 같은 행/칸에서 대조한다. 값이 안 보이거나 연결이 애매하면 null. 다른 항목이나 이전 기록으로 추측하지 않는다.`;

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
    maxTokens: 2600,
  });
  if (!res.ok) {
    // 서버 쪽 실패는 횟수를 돌려준다(무료 맛보기를 과부하에 잃지 않게).
    await refundAiQuota("body-scan");
    return { ok: false, error: res.error };
  }

  return { ok: true, ...checkBodyCompScan(parseLabeledBodyCompScan(res.text)) };
}
