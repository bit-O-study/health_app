import "server-only";

import { isDebugFeatureEnabled } from "@/features/admin/debug-features.server";
import { resolvePlan } from "@/features/billing/plan-store";
import { hasPlan, type PlanId } from "@/features/billing/plans";

export type FitAccess = {
  /** 앱이 보이나 — 라이트 이상이거나, 공개 스위치(`fit`)가 켜졌거나. */
  visible: boolean;
  /** 전부 열림(라이트 이상). false 면 무료 맛보기(추천 1개·부위 6개). */
  full: boolean;
  plan: PlanId;
};

/**
 * 맞춤 운동 앱 권한(2026-10-01). 라이트(990원) 혜택이라 **라이트 이상이면 스위치와 상관없이**
 * 보인다 — 돈 낸 사람이 공개 전이라 못 쓰면 안 된다. 무료 회원은 관리자가 스위치를 열 때까지 숨김.
 */
export async function getFitAccess(): Promise<FitAccess> {
  const [plan, flag] = await Promise.all([resolvePlan(), isDebugFeatureEnabled("fit")]);
  const full = hasPlan(plan, "lite");
  return { visible: full || flag, full, plan };
}
