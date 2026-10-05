import "server-only";

import { cache } from "react";

import { isDebugFeatureEnabled } from "@/features/admin/debug-features.server";
import type { DebugFeatureId } from "@/features/admin/debug-features";
import { resolveTier } from "@/features/coach/ai-usage";

/**
 * 이 회원의 요금제에 AI 가 있는가 — 990원 라이트는 없다(2026-10-01 사용자 결정).
 * 못 읽으면 있다고 본다: 서버 액션(`consumeAiQuota`)이 어차피 한 번 더 막는다.
 */
export const aiAvailableForMe = cache(async (): Promise<boolean> => {
  try {
    return (await resolveTier()) !== "none";
  } catch {
    return true;
  }
});

/** AI 기능 스위치(디버그) + 요금제에 AI 가 있을 때만 — AI 버튼·화면은 이걸로 연다. */
export async function isAiFeatureEnabled(flag: DebugFeatureId): Promise<boolean> {
  const [on, ai] = await Promise.all([isDebugFeatureEnabled(flag), aiAvailableForMe()]);
  return on && ai;
}
