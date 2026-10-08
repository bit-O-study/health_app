import "server-only";

import { cache } from "react";

import { isDebugFeatureEnabled } from "@/features/admin/debug-features.server";
import { isAiFeatureEnabled } from "@/features/coach/ai-access.server";
import { getFitAccess } from "@/features/routine/fit-access";
import { hasTrainerPass } from "@/features/trainer/data";

/**
 * 이 사용자에게 보이는 런처 앱 스위치 — 홈 '내 앱'과 하단바가 **같은 목록**을 쓴다(2026-10-08).
 * 🔴 예전엔 홈과 레이아웃(하단바)이 따로 만들어 하단바에 맞춤 운동·AI 트레이너가 빠져 있었다 —
 *    맞춤 운동을 하단바에 넣어도 '앱 추가'로만 보였다.
 */
export const launcherFlags = cache(async (): Promise<string[]> => {
  const [coach, pet, trainer, aiTrainer, fit] = await Promise.all([
    isAiFeatureEnabled("helssu-coach"),
    isDebugFeatureEnabled("pet"),
    hasTrainerPass(),
    // AI 트레이너 탭(2026-09-30) — 공개 전, 자기 스위치.
    isAiFeatureEnabled("ai-trainer"),
    // 맞춤 운동(라이트) — 라이트 이상이면 스위치와 상관없이 보인다.
    getFitAccess(),
  ]);
  return [
    ...(coach ? ["helssu-coach"] : []),
    ...(pet ? ["pet"] : []),
    ...(trainer ? ["trainer-pass"] : []),
    ...(aiTrainer ? ["ai-trainer"] : []),
    ...(fit.visible ? ["fit"] : []),
  ];
});
