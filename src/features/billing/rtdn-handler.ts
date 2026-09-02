import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseRtdn, type RtdnEvent } from "@/features/billing/rtdn";
import { verifyPurchase } from "@/features/billing/play-verify";

/**
 * RTDN 처리 — 로드맵 7.1. 라우트는 얇게 두고 판단은 여기서.
 *
 * 🔴 **알림 내용을 그대로 반영하지 않는다.** 알림은 신호일 뿐이고 상태·만료일은 다시
 * 구글에 물어본다. 알림은 재시도 때문에 **순서가 뒤바뀌어** 올 수 있어서, 그대로 쓰면
 * 최신 상태가 옛 상태로 덮인다.
 */

export type RtdnOutcome =
  /** 처리했다(또는 우리가 할 일이 없었다). Pub/Sub 에 2xx 로 답한다. */
  | { ok: true; kind: string; applied: "updated" | "revoked" | "none" }
  /**
   * 지금은 처리 못 했다 — **재시도가 필요하다**(Pub/Sub 이 다시 보낸다).
   * 잠깐의 네트워크 오류로 환불 알림을 버리면 그 사용자는 계속 프리미엄이 된다.
   */
  | { ok: false; kind: string; retry: true };

/** 우리가 아는 구매인지 확인하고 상태를 갱신한다. */
export async function handleRtdn(body: unknown): Promise<RtdnOutcome> {
  const event = parseRtdn(body);
  if (event.action === "ignore" || !event.purchaseToken) {
    // 테스트 알림·일회성 상품 알림 등. 재시도해도 결과가 같으니 2xx 로 끝낸다.
    return { ok: true, kind: event.kind || "IGNORED", applied: "none" };
  }

  const admin = createSupabaseAdminClient();
  // 서비스 롤이 없으면 아무것도 못 쓴다 — 하지만 이건 **우리 설정 문제**라
  // 재시도하면 (설정이 채워진 뒤에) 성공한다.
  if (!admin) return { ok: false, kind: event.kind, retry: true };

  // 우리가 모르는 구매면 할 일이 없다. 아직 앱이 검증을 안 보낸 새 구매일 수 있는데,
  // 그건 앱이 곧 보낸다 — 여기서 새로 만들면 **어느 계정 것인지 알 수가 없다**.
  const { data, error } = await admin
    .from("subscriptions")
    .select("user_id")
    .eq("purchase_token", event.purchaseToken)
    .maybeSingle();
  if (error) return { ok: false, kind: event.kind, retry: true };
  if (!data) return { ok: true, kind: event.kind, applied: "none" };

  if (event.action === "revoke") return revoke(event, admin);
  return reverify(event, admin);
}

type Admin = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;

/**
 * 환불·무효 — 만료 시각이 남아 있어도 **즉시** 끝낸다.
 * 만료를 지금으로 당기는 게 핵심이다(상태만 바꾸면 우리 권한 판정은 만료를 보므로
 * 아무 일도 일어나지 않는다).
 */
async function revoke(event: RtdnEvent, admin: Admin): Promise<RtdnOutcome> {
  const { error } = await admin
    .from("subscriptions")
    .update({
      state: "expired",
      expires_at: new Date().toISOString(),
      auto_renewing: false,
      updated_at: new Date().toISOString(),
    })
    .eq("purchase_token", event.purchaseToken);
  if (error) return { ok: false, kind: event.kind, retry: true };
  return { ok: true, kind: event.kind, applied: "revoked" };
}

/** 그 밖의 알림 — 구글에 다시 물어보고 그 결과로 갱신한다. */
async function reverify(event: RtdnEvent, admin: Admin): Promise<RtdnOutcome> {
  const res = await verifyPurchase(event.purchaseToken);
  if (!res.ok) {
    // 없다(404) = 정말 사라진 구매다. 권한을 거둔다.
    if (res.reason === "not-found") return revoke(event, admin);
    // 설정이 안 됐거나 못 물어봤다 — 재시도해야 한다.
    return { ok: false, kind: event.kind, retry: true };
  }
  const { error } = await admin
    .from("subscriptions")
    .update({
      product_id: res.record.productId,
      state: res.record.state,
      expires_at: res.record.expiresAt,
      auto_renewing: res.record.autoRenewing,
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("purchase_token", event.purchaseToken);
  if (error) return { ok: false, kind: event.kind, retry: true };
  return { ok: true, kind: event.kind, applied: "updated" };
}
