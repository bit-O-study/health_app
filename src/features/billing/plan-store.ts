import "server-only";

import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { isEntitled } from "@/features/billing/subscription";
import { getMySubscription } from "@/features/billing/subscription-store";
import { hasTeamPremium } from "@/features/billing/team-store";
import {
  SPONSORED_PLAN,
  higherPlan,
  planForProduct,
  type PlanId,
} from "@/features/billing/plans";

/**
 * 연결된 트레이너 중 정액권이 **오늘** 살아 있는 사람이 있나.
 *
 * 회원은 자기 연결(`pt_links.member_id = 나`)을 읽을 수 있고, 정액권 판정은 DB 함수
 * `pt_has_pass(트레이너)` 하나에 맡긴다 — 기간 규칙을 앱에서 다시 짜면 두 벌이 된다.
 * 실패하면 false(주지 않는 쪽이 안전하다).
 */
export async function hasTrainerSponsoredPlan(): Promise<boolean> {
  try {
    const user = await getCurrentUser();
    if (!user) return false;
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("pt_links")
      .select("trainer_id")
      .eq("member_id", user.id)
      .eq("active", true);
    if (error || !data?.length) return false;
    const checks = await Promise.all(
      (data as { trainer_id: string }[]).map((r) =>
        supabase.rpc("pt_has_pass", { p_trainer: r.trainer_id }),
      ),
    );
    return checks.some((c) => !c.error && c.data === true);
  } catch {
    return false;
  }
}

export type PlanResolution = {
  plan: PlanId;
  /** 개인 구독으로 받은 요금제(없으면 free) — 구독 화면이 '내가 산 것'을 따로 보여 준다. */
  personal: PlanId;
  /** 트레이너·팀이 준 요금제인가. */
  sponsored: boolean;
};

/**
 * 지금 이 사용자의 요금제 — 개인 구독, 팀 구독(트레이너·헬스장), 트레이너 정액권 연결 중 높은 것.
 *
 * 🔴 요금제는 **구독 만료 시각**에서 나온다(`isEntitled`). 해지·환불·결제 실패는 만료로
 * 저절로 반영된다. 조회가 실패하면 무료 — 실수로 주는 쪽보다 안전하다.
 */
export async function resolvePlanDetail(): Promise<PlanResolution> {
  try {
    const [personalSub, team, trainer] = await Promise.all([
      getMySubscription(),
      hasTeamPremium(),
      hasTrainerSponsoredPlan(),
    ]);
    const personal: PlanId = isEntitled(personalSub)
      ? planForProduct(personalSub?.productId)
      : "free";
    const sponsored = team || trainer;
    return {
      plan: sponsored ? higherPlan(personal, SPONSORED_PLAN) : personal,
      personal,
      sponsored,
    };
  } catch {
    return { plan: "free", personal: "free", sponsored: false };
  }
}

export async function resolvePlan(): Promise<PlanId> {
  return (await resolvePlanDetail()).plan;
}
