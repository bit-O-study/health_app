/**
 * 구글 플레이 실시간 개발자 알림(RTDN) 해석 — 로드맵 7.1. 순수 모듈.
 *
 * 🔴 **왜 필요한가 — 환불이 권한을 안 뺏는다.**
 * 우리 권한은 만료 시각 기준이라, 사용자가 환불받아도 **결제한 기간이 끝날 때까지는
 * 그대로 프리미엄**이다. 앱을 안 열면 우리는 환불 사실을 영영 모른다. 구글이 보내 주는
 * 이 알림이 그 구멍을 막는 유일한 길이다.
 *
 * 🔴 **알림 내용을 그대로 믿지 않는다.** 알림은 "이 구매에 무슨 일이 있었다" 는 *신호*로만
 * 쓰고, 상태·만료일은 **다시 구글 API 에 물어본다**. 알림은 순서가 뒤바뀌어 올 수 있고
 * (재시도 때문에 오래된 알림이 나중에 도착한다), 그걸 그대로 반영하면 최신 상태가
 * 옛 상태로 덮인다.
 */

/** 알림이 우리에게 시키는 일. */
export type RtdnAction =
  /** 구글에 다시 물어보고 그 결과로 갱신한다(대부분의 경우). */
  | "reverify"
  /** 환불·취소로 구매가 무효가 됐다 — 권한을 즉시 거둔다. */
  | "revoke"
  /** 우리가 할 일이 없다(테스트 알림 등). */
  | "ignore";

export type RtdnEvent = {
  action: RtdnAction;
  /** 대상 구매 토큰. `ignore` 면 빈 문자열일 수 있다. */
  purchaseToken: string;
  /** 구독 상품 id(알림에 있으면). */
  subscriptionId: string;
  /** 무슨 알림이었는지 — 로그·디버깅용. */
  kind: string;
  packageName: string;
};

const IGNORED: RtdnEvent = {
  action: "ignore",
  purchaseToken: "",
  subscriptionId: "",
  kind: "",
  packageName: "",
};

/**
 * 구독 알림 종류(`subscriptionNotification.notificationType`).
 * 숫자를 그대로 쓰지 않고 이름을 붙인다 — 나중에 로그를 볼 때 4가 뭔지 아무도 모른다.
 */
export const SUBSCRIPTION_NOTIFICATION_NAMES: Record<number, string> = {
  1: "RECOVERED",
  2: "RENEWED",
  3: "CANCELED",
  4: "PURCHASED",
  5: "ON_HOLD",
  6: "IN_GRACE_PERIOD",
  7: "RESTARTED",
  8: "PRICE_CHANGE_CONFIRMED",
  9: "DEFERRED",
  10: "PAUSED",
  11: "PAUSE_SCHEDULE_CHANGED",
  12: "REVOKED",
  13: "EXPIRED",
  20: "PENDING_PURCHASE_CANCELED",
};

/**
 * 즉시 권한을 거둬야 하는 종류.
 *
 * `REVOKED`(12)는 **환불 등으로 구매가 무효화된 것**이라 만료 시각이 남아 있어도 끝이다.
 * 나머지는(만료·해지 포함) 다시 물어보면 만료 시각이 정확히 나오므로 재검증으로 충분하다.
 */
const REVOKING = new Set([12]);

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/** base64(또는 base64url) → UTF-8 문자열. 못 읽으면 빈 문자열. */
function decodeBase64(data: string): string {
  try {
    return Buffer.from(data, "base64").toString("utf8");
  } catch {
    return "";
  }
}

/**
 * Pub/Sub 푸시 본문 → 우리가 할 일.
 *
 * 형태: `{ message: { data: "<base64 JSON>" }, subscription: "..." }`
 * 안쪽 JSON: `{ packageName, subscriptionNotification | voidedPurchaseNotification | testNotification }`
 *
 * 모양이 조금이라도 다르면 **`ignore`** 를 돌려준다 — 알 수 없는 알림에 반응해서
 * 남의 구독을 건드리는 것보다, 아무 일도 안 하는 게 낫다.
 */
export function parseRtdn(body: unknown): RtdnEvent {
  const message = (body as { message?: { data?: unknown } } | null)?.message;
  const data = message?.data;
  if (typeof data !== "string" || data === "") return IGNORED;

  let payload: Record<string, unknown>;
  try {
    const json = decodeBase64(data);
    if (!json) return IGNORED;
    const parsed = JSON.parse(json) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return IGNORED;
    payload = parsed as Record<string, unknown>;
  } catch {
    return IGNORED;
  }

  const packageName = str(payload.packageName);

  // 환불·취소 — 구매 자체가 무효가 됐다.
  const voided = payload.voidedPurchaseNotification as
    | { purchaseToken?: unknown }
    | undefined;
  if (voided && str(voided.purchaseToken)) {
    return {
      action: "revoke",
      purchaseToken: str(voided.purchaseToken),
      subscriptionId: "",
      kind: "VOIDED_PURCHASE",
      packageName,
    };
  }

  const sub = payload.subscriptionNotification as
    | { purchaseToken?: unknown; subscriptionId?: unknown; notificationType?: unknown }
    | undefined;
  if (sub && str(sub.purchaseToken)) {
    const type = Number(sub.notificationType);
    const known = Number.isFinite(type) ? type : -1;
    return {
      // 모르는 종류도 **재검증**한다. 새 종류가 생겼을 때 무시하면 상태가 낡은 채로 남는다.
      action: REVOKING.has(known) ? "revoke" : "reverify",
      purchaseToken: str(sub.purchaseToken),
      subscriptionId: str(sub.subscriptionId),
      kind: SUBSCRIPTION_NOTIFICATION_NAMES[known] ?? `UNKNOWN_${sub.notificationType}`,
      packageName,
    };
  }

  // testNotification 및 그 밖의 것(일회성 상품 알림 등) — 우리가 할 일이 없다.
  return { ...IGNORED, kind: payload.testNotification ? "TEST" : "", packageName };
}
