"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/supabase/server";
import {
  acknowledgePurchase,
  billingSetup,
  verifyPurchase,
} from "@/features/billing/play-verify";
import {
  getMySubscription,
  saveSubscription,
} from "@/features/billing/subscription-store";
import { isEntitled, statusLabel } from "@/features/billing/subscription";

/**
 * 구매 확인·복원 — 로드맵 7.1.
 *
 * 🔴 앱은 **구매 토큰만** 보낸다. 상태·만료일은 서버가 구글에 직접 물어본다.
 * 앱이 보낸 상태를 저장하면 앱을 고친 사람은 누구나 프리미엄이 된다.
 */

export type BillingStatus = {
  premium: boolean;
  label: string;
  /** 검증이 가능한 환경인가(설정이 다 됐는가). */
  ready: boolean;
  expiresAt: string | null;
};

export async function getBillingStatusAction(): Promise<BillingStatus> {
  const sub = await getMySubscription();
  return {
    premium: isEntitled(sub),
    label: statusLabel(sub),
    ready: billingSetup().ready,
    expiresAt: sub?.expiresAt ?? null,
  };
}

export type VerifyPurchaseResult =
  | { ok: true; status: BillingStatus }
  | { ok: false; error: string };

/**
 * 앱이 결제(또는 복원)한 구매 토큰을 확인해 권한에 반영한다.
 *
 * 실패를 뭉뚱그리지 않는다 — 사용자가 할 수 있는 일이 경우마다 다르기 때문이다.
 */
export async function verifyPurchaseAction(
  purchaseToken: string,
): Promise<VerifyPurchaseResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요해요." };

  const setup = billingSetup();
  if (!setup.ready) {
    // 설정이 안 된 걸 오류로 보여주면 사용자가 자기 잘못인 줄 안다.
    return { ok: false, error: "구독 기능이 아직 준비 중이에요." };
  }
  const token = (purchaseToken ?? "").trim();
  if (!token) return { ok: false, error: "구매 정보를 받지 못했어요." };

  const res = await verifyPurchase(token);
  if (!res.ok) {
    if (res.reason === "not-found") {
      return { ok: false, error: "구글 플레이에서 이 구매를 찾지 못했어요." };
    }
    // 🔴 못 물어본 것뿐이다 — 기존 권한을 **뺏지 않는다**. 네트워크가 잠깐 안 되는
    // 것으로 결제한 사용자의 권한이 사라지면 안 된다.
    return {
      ok: false,
      error: "지금은 구매를 확인할 수 없어요. 잠시 뒤 다시 시도해 주세요.",
    };
  }

  const saved = await saveSubscription(user.id, token, res.record);
  if (!saved.ok) {
    if (saved.reason === "token-taken") {
      return {
        ok: false,
        error: "이 구매는 다른 계정에 이미 연결돼 있어요.",
      };
    }
    return { ok: false, error: "구매는 확인했지만 저장하지 못했어요." };
  }

  // 🔴 수령 확인 — 3일 안에 안 하면 구글이 자동으로 환불한다(돈은 냈는데 며칠 뒤
  // 환불되고 권한도 사라지는, 원인을 짐작하기 어려운 사고). 저장까지 끝난 뒤에 한다:
  // 저장에 실패한 구매를 확정해 버리면 돈만 받고 권한은 없는 상태가 된다.
  // 실패해도 넘어간다 — 3일 안에 다시 열면 재검증이 다시 시도한다.
  if (res.needsAcknowledge) {
    await acknowledgePurchase(res.record.productId, token);
  }

  // 한도·화면이 곧바로 새 등급을 보게.
  revalidatePath("/settings/subscription");
  revalidatePath("/coach");
  return { ok: true, status: await getBillingStatusAction() };
}
