import "server-only";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import {
  limitFor,
  overLimitMessage,
  quotaState,
  usageMonth,
  type AiFeatureId,
  type AiTier,
  type QuotaState,
} from "@/features/coach/ai-quota";

/**
 * AI 사용량 세기 — 로드맵 7.1. 판단·표는 순수 모듈(`ai-quota.ts`)에 있고 여기선 센다.
 */

/**
 * 이 사용자의 등급.
 *
 * 🔴 **아직 아무도 프리미엄이 아니다.** 결제가 붙기 전까지 전부 무료 등급이다 —
 * 결제 없이 프리미엄을 나눠 주는 가짜 등급을 만들면, 나중에 결제를 붙일 때
 * "쓰던 게 갑자기 막히는" 경험이 된다. 7.1 의 다음 칸(결제 상태 확인)에서 여기만 고친다.
 */
export async function resolveTier(): Promise<AiTier> {
  return "free";
}

export type ConsumeResult =
  | { ok: true; state: QuotaState }
  /** 한도 초과 — 화면에 그대로 띄울 문장을 같이 준다. */
  | { ok: false; state: QuotaState; message: string };

/**
 * 한 번 쓴다고 세고, 넘었으면 막는다.
 *
 * 🔴 **검사와 증가를 한 문장으로** 한다(`consume_ai_quota`). 읽고 나서 올리면 그 사이에
 * 다른 요청이 끼어들어 한도를 넘길 수 있다 — 사진 스캔은 실패하면 연타하는 기능이라
 * 이 틈이 실제로 벌어진다.
 *
 * 🔴 **세는 데 실패하면 통과시킨다.** 사용량 집계가 우리 사정으로 안 될 때 사용자의
 * 기능을 막는 건 이상하다(관측 실패가 기능 실패가 되면 안 된다 — 1.3 과 같은 원칙).
 * 비용이 걱정되는 상황이면 그건 우리가 고칠 일이지 사용자가 벌 받을 일이 아니다.
 */
export async function consumeAiQuota(
  feature: AiFeatureId,
  now: Date = new Date(),
): Promise<ConsumeResult> {
  const tier = await resolveTier();
  const limit = limitFor(tier, feature);
  const passThrough = (used: number): ConsumeResult => ({
    ok: true,
    state: quotaState(feature, tier, used),
  });

  try {
    const user = await getCurrentUser();
    // 로그인 안 한 사용자는 AI 기능에 닿을 수 없다 — 여기서 막을 일이 아니라
    // 호출부가 이미 막는다. 세지 못할 뿐이니 통과시킨다.
    if (!user) return passThrough(0);

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("consume_ai_quota", {
      p_feature: feature,
      p_month: usageMonth(now),
      p_limit: limit,
    });
    if (error) return passThrough(0);

    const used = typeof data === "number" ? data : Number(data);
    if (!Number.isFinite(used)) return passThrough(0);
    if (used < 0) {
      // 한도 초과 — 이번 호출은 세지 않았다(증가하지 않았다).
      const state = quotaState(feature, tier, limit);
      return { ok: false, state, message: overLimitMessage(state) };
    }
    return passThrough(used);
  } catch {
    return passThrough(0);
  }
}

/** 지금까지 쓴 양(안내용). 실패하면 0 — 숫자를 못 읽었다고 화면이 죽으면 안 된다. */
export async function readAiUsage(
  feature: AiFeatureId,
  now: Date = new Date(),
): Promise<QuotaState> {
  const tier = await resolveTier();
  try {
    const user = await getCurrentUser();
    if (!user) return quotaState(feature, tier, 0);
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("ai_usage")
      .select("used")
      .eq("user_id", user.id)
      .eq("month", usageMonth(now))
      .eq("feature", feature)
      .maybeSingle();
    const used = Number((data as { used?: number } | null)?.used ?? 0);
    return quotaState(feature, tier, Number.isFinite(used) ? used : 0);
  } catch {
    return quotaState(feature, tier, 0);
  }
}
