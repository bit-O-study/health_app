"use server";

import { isDebugFeatureEnabled } from "@/features/admin/debug-features.server";
import { callAI } from "@/features/coach/ai";
import { parseMealScan, type ScannedFood } from "@/features/diet/meal-scan-parse";
import { persistScannedFoods } from "@/features/diet/custom-foods";
import type { Meal } from "@/features/diet/meal";

export type MealScanResult =
  | { ok: true; meal: Meal | null; items: ScannedFood[] }
  | { ok: false; error: string };

const SYSTEM = `너는 한국 음식에 특히 밝은 영양 분석가다. 사진 속 음식을 보고 각 음식의 이름과 1인분 기준 추정 영양을 매긴다.
반드시 JSON 객체 하나만 출력한다(설명·코드펜스 없이):
{"meal":"breakfast|lunch|dinner|snack|null","items":[{"name":"음식 이름(한국어)","amount":"양 표기(예: 1공기, 150g)","kcal":숫자,"protein":숫자,"carbs":숫자,"fat":숫자}]}
규칙:
- 사진에 보이는 음식마다 items 에 1개씩.
- 이름은 최대한 구체적인 한국 메뉴명으로. 국·탕·국밥류는 "국밥"·"탕"처럼 뭉뚱그리지 말고
  재료·종류까지 구분해 정확히 적는다. 예: 뼈해장국, 선지해장국, 콩나물해장국, 순대국,
  돼지국밥, 소머리국밥, 내장탕, 감자탕, 설렁탕, 곰탕, 육개장, 갈비탕, 삼계탕,
  해물탕, 알탕, 대구탕, 매운탕, 부대찌개, 김치찌개, 된장찌개, 순두부찌개.
  확실치 않으면 가장 근접한 구체적 메뉴명을 고르고, 정말 불명확할 때만 상위 분류명을 쓴다.
- kcal·protein·carbs·fat 은 g 단위 숫자(추정, 모르면 0).
- meal 은 사진 분위기로 추정(모르면 null).
- 음식이 아니면 items 는 빈 배열.`;

/**
 * 식단 사진 1장 → AI 비전으로 음식·칼로리·매크로 추정 목록을 돌려준다.
 * 여기서 DB 에 바로 쓰지 않고, 사용자가 UI 에서 확인 후 기존 addFoodLogAction 으로 담는다.
 * `diet-photo-ai` 디버그 기능이 켜진 계정에만 허용.
 */
export async function scanMealPhotoAction(input: {
  imageBase64: string;
  mediaType: string;
}): Promise<MealScanResult> {
  if (!(await isDebugFeatureEnabled("diet-photo-ai"))) {
    return { ok: false, error: "AI 식단 인식은 아직 사용할 수 없습니다." };
  }
  if (!input.imageBase64) return { ok: false, error: "사진이 없습니다." };

  // 테스트 전용 시드 — NVIDIA 호출 없이 고정 결과. E2E(중복담기·사진등록 회귀)에서만.
  // 프로덕션에선 절대 켜지지 않도록 NODE_ENV 로 이중 가드.
  if (process.env.NODE_ENV !== "production" && process.env.MEAL_SCAN_STUB === "1") {
    return {
      ok: true,
      meal: "lunch",
      items: [
        { name: "스캔테스트밥", amount: "1공기", kcal: 300, protein: 6, carbs: 65, fat: 1 },
      ],
    };
  }

  const res = await callAI(SYSTEM, "이 사진의 음식을 분석해줘.", {
    images: [{ base64: input.imageBase64, mediaType: input.mediaType }],
    maxTokens: 1000,
  });
  if (!res.ok) return { ok: false, error: res.error };

  const scan = parseMealScan(res.text);
  if (scan.items.length === 0) {
    return { ok: false, error: "사진에서 음식을 찾지 못했어요. 다시 찍어보세요." };
  }
  // 카탈로그에 없는 음식은 자동 성장 카탈로그(custom_foods)에 축적 → 다음부터 검색됨.
  await persistScannedFoods(scan.items);
  return { ok: true, meal: scan.meal, items: scan.items };
}