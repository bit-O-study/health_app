"use server";

import { isDebugFeatureEnabled } from "@/features/admin/debug-features.server";
import { analyzeEquipmentImage } from "@/features/equipment/vision";
import { matchCatalogExercise, type CatalogRef } from "@/features/equipment/catalog-match";
import type { Confidence } from "@/features/equipment/parse";

export type AnalyzedExercise = {
  name: string;
  description: string;
  /** 앱 카탈로그에 있으면 /exercises/[slug] 링크용 참조 */
  catalog: CatalogRef | null;
};

export type EquipmentAnalysis = {
  equipmentName: string;
  equipmentNameEn: string;
  confidence: Confidence;
  summary: string;
  muscles: string[];
  exercises: AnalyzedExercise[];
};

export type EquipmentAnalysisResult =
  | { ok: true; analysis: EquipmentAnalysis }
  | { ok: false; error: string };

/**
 * 기구 사진(base64)을 분석해 기구 이름·자극 근육·가능한 운동을 돌려준다.
 * 지금은 디버그 기능(기구 스캔)이 켜진 '디버그 계정(관리자)' 에게만 허용.
 * 각 운동은 앱 카탈로그에 매칭되면 상세 페이지로 링크할 수 있게 slug 를 붙인다.
 */
export async function analyzeEquipmentAction(input: {
  imageBase64: string;
  mediaType: string;
}): Promise<EquipmentAnalysisResult> {
  if (!(await isDebugFeatureEnabled("equipment-scan"))) {
    return { ok: false, error: "이 기능은 아직 사용할 수 없습니다." };
  }
  const b64 = (input.imageBase64 ?? "").trim();
  if (!b64) return { ok: false, error: "사진이 없습니다." };
  // 과금·업로드 폭주 방지: 대략 8MB(base64) 상한.
  if (b64.length > 8 * 1024 * 1024) {
    return { ok: false, error: "사진 용량이 너무 큽니다. 다시 시도해 주세요." };
  }

  const call = await analyzeEquipmentImage(b64, input.mediaType || "image/jpeg");
  if (!call.ok) return { ok: false, error: call.error };

  const exercises: AnalyzedExercise[] = call.result.exercises.map((e) => ({
    name: e.name,
    description: e.description,
    catalog: matchCatalogExercise(e.name),
  }));

  return {
    ok: true,
    analysis: {
      equipmentName: call.result.equipmentName,
      equipmentNameEn: call.result.equipmentNameEn,
      confidence: call.result.confidence,
      summary: call.result.summary,
      muscles: call.result.muscles,
      exercises,
    },
  };
}
