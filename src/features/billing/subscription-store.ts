import "server-only";

import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SubscriptionRecord } from "@/features/billing/subscription";

/**
 * 구독 상태 저장·조회 — 로드맵 7.1.
 *
 * 🔴 **쓰기는 서비스 롤로만.** `subscriptions` 에는 사용자 쓰기 정책이 없다(RLS).
 * 사용자가 직접 쓸 수 있으면 스스로 프리미엄이 된다. 여기서 쓰는 값은 전부
 * "구글에 물어본 결과"다.
 */

export type StoredSubscription = SubscriptionRecord & {
  purchaseToken: string;
  verifiedAt: string;
};

/** 내 구독. 없으면 null. 읽기는 본인 RLS 로 충분하다. */
export async function getMySubscription(): Promise<StoredSubscription | null> {
  try {
    const user = await getCurrentUser();
    if (!user) return null;
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("subscriptions")
      .select("product_id, purchase_token, state, expires_at, auto_renewing, verified_at")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!data) return null;
    const r = data as {
      product_id: string;
      purchase_token: string;
      state: string;
      expires_at: string | null;
      auto_renewing: boolean;
      verified_at: string;
    };
    return {
      productId: r.product_id,
      purchaseToken: r.purchase_token,
      state: r.state as SubscriptionRecord["state"],
      expiresAt: r.expires_at,
      autoRenewing: r.auto_renewing === true,
      verifiedAt: r.verified_at,
    };
  } catch {
    return null;
  }
}

export type SaveOutcome =
  | { ok: true }
  /** 이 구매 토큰을 **다른 계정이 이미 쓰고 있다**. 하나를 돌려쓰는 것을 막는다. */
  | { ok: false; reason: "token-taken" }
  | { ok: false; reason: "failed" };

/** 유니크 위반(23505) — 구매 토큰이 다른 계정에 이미 붙어 있다. */
const UNIQUE_VIOLATION = "23505";

/**
 * 검증 결과를 저장한다. 사용자당 한 행(가장 최근 구매)이라 upsert.
 *
 * 서비스 롤이 필요하다 — 없으면 저장하지 못하고, 그 사실을 감추지 않는다
 * (조용히 실패하면 결제한 사용자가 계속 무료로 보인다).
 */
export async function saveSubscription(
  userId: string,
  purchaseToken: string,
  rec: SubscriptionRecord,
): Promise<SaveOutcome> {
  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, reason: "failed" };
  const { error } = await admin.from("subscriptions").upsert(
    {
      user_id: userId,
      platform: "google_play",
      product_id: rec.productId,
      purchase_token: purchaseToken,
      state: rec.state,
      expires_at: rec.expiresAt,
      auto_renewing: rec.autoRenewing,
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (!error) return { ok: true };
  if ((error as { code?: string }).code === UNIQUE_VIOLATION) {
    return { ok: false, reason: "token-taken" };
  }
  return { ok: false, reason: "failed" };
}
