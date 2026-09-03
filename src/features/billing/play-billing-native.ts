"use client";

/**
 * 구글 플레이 인앱결제 네이티브 브리지 — 로드맵 7.1.
 *
 * 결제창을 여는 일은 **네이티브만 할 수 있다**(Play Billing Library). 여기서는
 * 그 플러그인이 있으면 부르고, 없으면 조용히 "앱에서만 됩니다" 로 끝낸다.
 *
 * 🔴 이 파일이 돌려주는 것은 **구매 토큰뿐**이다. 상태·만료일은 절대 여기서 정하지
 * 않는다 — 서버가 구글에 직접 물어본다(`verifyPurchaseAction`). 앱은 뜯어보기 쉬워서,
 * 앱이 말하는 "구독 중" 을 믿으면 누구나 프리미엄이 된다.
 *
 * 건강 연동에서 배운 것을 그대로 따른다: 모든 네이티브 호출에 타임아웃(먹통이면 화면이
 * 통째로 멈춘다), UA 표식으로도 앱을 판별(브리지 주입 실패 버그).
 */

import {
  hasNativeUa,
  isNative,
  withTimeout,
} from "@/features/health/health-plugin";

/** 플러그인이 노출하는 것 중 우리가 쓰는 부분만. */
type PlayBillingLike = {
  /** 상품 구매 — 결제창을 띄우고, 끝나면 구매 토큰을 준다. */
  purchase?: (opts: { productId: string }) => Promise<{
    purchaseToken?: string;
    cancelled?: boolean;
  }>;
  /** 이미 산 구독을 다시 찾는다(기기 변경·재설치). */
  restore?: () => Promise<{ purchaseToken?: string }>;
};

function getPlugin(): PlayBillingLike | null {
  if (typeof window === "undefined") return null;
  const cap = (
    window as unknown as {
      Capacitor?: {
        Plugins?: Record<string, PlayBillingLike | undefined>;
        registerPlugin?: (name: string) => PlayBillingLike;
      };
    }
  ).Capacitor;
  if (!cap) return null;
  try {
    return cap.Plugins?.PlayBilling ?? cap.registerPlugin?.("PlayBilling") ?? null;
  } catch {
    return null;
  }
}

export type PurchaseOutcome =
  /** 구매(또는 복원) 성공 — **토큰만** 준다. */
  | { ok: true; purchaseToken: string }
  /** 사용자가 결제창을 닫았다. 오류가 아니다 — 빨간 글씨를 띄우면 안 된다. */
  | { ok: false; reason: "cancelled" }
  | { ok: false; reason: "unavailable"; message: string };

/** 앱 안에서 결제를 시도할 수 있는 상태인가(플러그인 유무는 부를 때 판단). */
export async function canPurchase(): Promise<boolean> {
  return hasNativeUa() || (await isNative());
}

export async function purchaseSubscription(
  productId: string,
): Promise<PurchaseOutcome> {
  if (!(await canPurchase())) {
    return { ok: false, reason: "unavailable", message: "구독은 앱에서만 신청할 수 있어요." };
  }
  const plugin = getPlugin();
  if (!plugin?.purchase) {
    return {
      ok: false,
      reason: "unavailable",
      message: "앱을 최신 버전으로 업데이트해 주세요.",
    };
  }
  try {
    // 결제창은 사용자가 오래 붙들 수 있다 — 다른 네이티브 호출보다 넉넉하게.
    const res = await withTimeout(plugin.purchase({ productId }), 180_000, null);
    if (!res) {
      return { ok: false, reason: "unavailable", message: "결제창이 응답하지 않았어요." };
    }
    if (res.cancelled) return { ok: false, reason: "cancelled" };
    if (!res.purchaseToken) {
      return { ok: false, reason: "unavailable", message: "구매 정보를 받지 못했어요." };
    }
    return { ok: true, purchaseToken: res.purchaseToken };
  } catch (e) {
    return {
      ok: false,
      reason: "unavailable",
      message: e instanceof Error ? e.message : "결제에 실패했어요.",
    };
  }
}

/** 기기를 바꾸거나 다시 설치했을 때 — 이미 산 구독을 찾아 토큰을 돌려준다. */
export async function restorePurchase(): Promise<PurchaseOutcome> {
  if (!(await canPurchase())) {
    return { ok: false, reason: "unavailable", message: "구독 복원은 앱에서만 돼요." };
  }
  const plugin = getPlugin();
  if (!plugin?.restore) {
    return {
      ok: false,
      reason: "unavailable",
      message: "앱을 최신 버전으로 업데이트해 주세요.",
    };
  }
  try {
    const res = await withTimeout(plugin.restore(), 20_000, null);
    if (!res?.purchaseToken) {
      return {
        ok: false,
        reason: "unavailable",
        message: "이 구글 계정에서 구독을 찾지 못했어요.",
      };
    }
    return { ok: true, purchaseToken: res.purchaseToken };
  } catch (e) {
    return {
      ok: false,
      reason: "unavailable",
      message: e instanceof Error ? e.message : "복원에 실패했어요.",
    };
  }
}
