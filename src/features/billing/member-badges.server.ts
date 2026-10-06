import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasPlan, planForProduct, type PlanId } from "@/features/billing/plans";
import { isEntitled, type SubscriptionState } from "@/features/billing/subscription";

/**
 * 커뮤니티 이름 옆 '라이트' 배지(2026-10-02 라이트 혜택 D2) — 글쓴이들의 **개인 구독** 요금제.
 *
 * 🔴 구독은 본인만 읽는 표(RLS)라 서비스 롤로 읽는다. 밖으로는 '라이트 이상인가'만 내보낸다
 *    (상품·만료 시각 같은 결제 정보는 화면에 안 나간다). 실패하면 빈 표 — 배지가 없을 뿐이다.
 */
export async function paidMemberIds(userIds: readonly string[]): Promise<Set<string>> {
  const ids = [...new Set(userIds)].filter(Boolean).slice(0, 500);
  const out = new Set<string>();
  if (ids.length === 0) return out;
  try {
    const admin = createSupabaseAdminClient();
    if (!admin) return out;
    const { data } = await admin
      .from("subscriptions")
      .select("user_id, product_id, state, expires_at, auto_renewing")
      .in("user_id", ids);
    for (const r of (data ?? []) as {
      user_id: string;
      product_id: string;
      state: string;
      expires_at: string | null;
      auto_renewing: boolean;
    }[]) {
      const rec = { productId: r.product_id, state: r.state as SubscriptionState, expiresAt: r.expires_at, autoRenewing: r.auto_renewing };
      const plan: PlanId = isEntitled(rec) ? planForProduct(r.product_id) : "free";
      if (hasPlan(plan, "lite")) out.add(r.user_id);
    }
  } catch {
    /* 배지가 안 보일 뿐 — 피드는 그대로 */
  }
  return out;
}
