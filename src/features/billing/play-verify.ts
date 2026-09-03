import "server-only";

import {
  getGoogleAccessToken,
  loadServiceAccount,
} from "@/lib/google/service-account";
import {
  mapPlayState,
  needsAcknowledge,
  pickAutoRenewing,
  pickExpiry,
  pickProductId,
  type SubscriptionRecord,
} from "@/features/billing/subscription";

/**
 * 구글 플레이 구매 검증 — 로드맵 7.1.
 *
 * 🔴 **앱이 보낸 말은 믿지 않는다.** 앱은 구매 토큰만 보내고, "구독 중인지·언제까지인지"
 * 는 **서버가 구글에 직접 물어본다**. 앱이 보낸 상태를 그대로 저장하면 앱을 고친
 * 사람은 누구나 프리미엄이 된다(안드로이드 앱은 뜯어보기 쉽다).
 *
 * 설정에 필요한 것(사용자가 준비해야 함):
 *  - `GOOGLE_PLAY_SERVICE_ACCOUNT` — Play Console 에서 만든 서비스 계정 JSON(문자열).
 *    Play Console → 사용자 및 권한에서 그 계정에 **재무 데이터 보기** 권한을 줘야 한다.
 *  - `GOOGLE_PLAY_PACKAGE_NAME` — 앱 패키지명(예: com.heltch.health).
 * 없으면 `playBillingEnabled()` 가 false 라 화면이 "준비 중" 으로 안내한다 —
 * 설정이 안 된 걸 오류로 보여주면 사용자가 자기 잘못인 줄 안다.
 */

const SCOPE = "https://www.googleapis.com/auth/androidpublisher";

export function playPackageName(): string {
  return process.env.GOOGLE_PLAY_PACKAGE_NAME ?? "";
}

/** 서버가 구매를 검증할 수 있는 상태인가. */
export function playBillingEnabled(): boolean {
  return (
    loadServiceAccount("GOOGLE_PLAY_SERVICE_ACCOUNT") !== null &&
    playPackageName() !== ""
  );
}

export type VerifyResult =
  | {
      ok: true;
      record: SubscriptionRecord;
      /**
       * 아직 '수령 확인'(acknowledge)을 안 한 구매인가.
       * 🔴 3일 안에 확인하지 않으면 **구글이 자동으로 환불**한다.
       */
      needsAcknowledge: boolean;
    }
  /** 구글이 "그런 구매 없음"(404)이라 답했다 — 가짜 토큰이거나 이미 취소된 것. */
  | { ok: false; reason: "not-found" }
  /** 우리 설정이 안 됐다. 사용자 잘못이 아니다. */
  | { ok: false; reason: "not-configured" }
  /** 구글에 못 물어봤다(네트워크·권한). 이때 **기존 권한을 뺏지 않는다**. */
  | { ok: false; reason: "unavailable" };

/**
 * 구매 토큰 하나를 구글에 물어본다(`purchases.subscriptionsv2.get`).
 *
 * 실패를 세 가지로 나누는 이유: **"없다"와 "못 물어봤다"는 다르다.** 네트워크가
 * 잠깐 안 되는 것으로 결제한 사용자의 권한을 뺏으면 안 된다.
 */
export async function verifyPurchase(
  purchaseToken: string,
): Promise<VerifyResult> {
  const sa = loadServiceAccount("GOOGLE_PLAY_SERVICE_ACCOUNT");
  const pkg = playPackageName();
  if (!sa || !pkg) return { ok: false, reason: "not-configured" };
  if (!purchaseToken) return { ok: false, reason: "not-found" };

  const token = await getGoogleAccessToken(sa, SCOPE);
  if (!token) return { ok: false, reason: "unavailable" };

  const url =
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/` +
    `${encodeURIComponent(pkg)}/purchases/subscriptionsv2/tokens/` +
    `${encodeURIComponent(purchaseToken)}`;

  let res: Response;
  try {
    res = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  } catch {
    return { ok: false, reason: "unavailable" };
  }
  // 404/410 = 그런 구매가 없다. 그 외 오류는 우리 쪽 사정일 수 있으니 구분한다.
  if (res.status === 404 || res.status === 410) return { ok: false, reason: "not-found" };
  if (!res.ok) return { ok: false, reason: "unavailable" };

  const body = (await res.json().catch(() => null)) as {
    subscriptionState?: unknown;
    acknowledgementState?: unknown;
    lineItems?: unknown;
  } | null;
  if (!body) return { ok: false, reason: "unavailable" };

  return {
    ok: true,
    record: {
      productId: pickProductId(body.lineItems),
      state: mapPlayState(body.subscriptionState),
      expiresAt: pickExpiry(body.lineItems),
      autoRenewing: pickAutoRenewing(body.lineItems),
    },
    needsAcknowledge: needsAcknowledge(body.acknowledgementState),
  };
}

/**
 * 🔴 구매 '수령 확인'(acknowledge) — **3일 안에 안 하면 구글이 자동으로 환불한다.**
 * 사용자는 돈을 냈는데 며칠 뒤 환불되고 권한도 사라지는, 원인을 짐작하기 어려운 사고다.
 *
 * 확인은 **서버가 한다**(앱이 아니라). 검증에 성공한 그 자리가 확인해도 되는지 아는
 * 유일한 지점이다 — 앱이 먼저 확인해 버리면, 서버가 거절한 구매까지 확정된다.
 *
 * 실패해도 던지지 않는다. 확인은 3일 동안 다시 시도할 수 있으므로(앱을 다시 열면
 * 재검증이 돈다), 이번 한 번 실패로 사용자를 막을 이유가 없다.
 */
export async function acknowledgePurchase(
  productId: string,
  purchaseToken: string,
): Promise<boolean> {
  const sa = loadServiceAccount("GOOGLE_PLAY_SERVICE_ACCOUNT");
  const pkg = playPackageName();
  if (!sa || !pkg || !productId || !purchaseToken) return false;
  const token = await getGoogleAccessToken(sa, SCOPE);
  if (!token) return false;

  const url =
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/` +
    `${encodeURIComponent(pkg)}/purchases/subscriptions/` +
    `${encodeURIComponent(productId)}/tokens/` +
    `${encodeURIComponent(purchaseToken)}:acknowledge`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: "{}",
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** 결제 검증이 실제로 돌 수 있으려면 뭐가 더 필요한지 — 화면이 정확히 안내하도록. */
export type BillingSetup = {
  ready: boolean;
  /** 아직 없는 설정 이름들(관리자용). 사용자에게는 이름을 보여주지 않는다. */
  missing: string[];
};

export function billingSetup(): BillingSetup {
  const missing: string[] = [];
  if (loadServiceAccount("GOOGLE_PLAY_SERVICE_ACCOUNT") === null) {
    missing.push("GOOGLE_PLAY_SERVICE_ACCOUNT");
  }
  if (!playPackageName()) missing.push("GOOGLE_PLAY_PACKAGE_NAME");
  // 검증 결과를 저장하려면 서비스 롤이 필요하다 — `subscriptions` 에는 사용자 쓰기
  // 정책이 없다(그게 이 기능의 안전장치다).
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY");
  }
  return { ready: missing.length === 0, missing };
}
