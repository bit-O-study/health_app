import { describe, expect, it } from "vitest";

import {
  SUBSCRIPTION_NOTIFICATION_NAMES,
  parseRtdn,
} from "@/features/billing/rtdn";

/** Pub/Sub 푸시 본문 모양으로 감싼다. */
function push(payload: unknown) {
  return {
    message: { data: Buffer.from(JSON.stringify(payload)).toString("base64") },
    subscription: "projects/x/subscriptions/y",
  };
}

const PKG = "app.helssu.twa";

describe("parseRtdn — 알림을 우리가 할 일로", () => {
  it("구독 알림은 재검증 대상", () => {
    const e = parseRtdn(
      push({
        packageName: PKG,
        subscriptionNotification: {
          purchaseToken: "tok-1",
          subscriptionId: "helssu_premium_monthly",
          notificationType: 2, // RENEWED
        },
      }),
    );
    expect(e.action).toBe("reverify");
    expect(e.purchaseToken).toBe("tok-1");
    expect(e.subscriptionId).toBe("helssu_premium_monthly");
    expect(e.kind).toBe("RENEWED");
    expect(e.packageName).toBe(PKG);
  });

  it("🔴 환불(voidedPurchase)은 즉시 권한 회수", () => {
    const e = parseRtdn(
      push({
        packageName: PKG,
        voidedPurchaseNotification: { purchaseToken: "tok-2", orderId: "GPA.1" },
      }),
    );
    expect(e.action).toBe("revoke");
    expect(e.purchaseToken).toBe("tok-2");
    expect(e.kind).toBe("VOIDED_PURCHASE");
  });

  it("🔴 REVOKED(12)도 즉시 회수 — 만료가 남아 있어도 끝난 구매다", () => {
    const e = parseRtdn(
      push({
        packageName: PKG,
        subscriptionNotification: { purchaseToken: "t", notificationType: 12 },
      }),
    );
    expect(e.action).toBe("revoke");
    expect(e.kind).toBe("REVOKED");
  });

  it("만료·해지는 재검증으로 충분하다 — 다시 물으면 만료 시각이 정확히 나온다", () => {
    for (const type of [3, 13]) {
      const e = parseRtdn(
        push({
          packageName: PKG,
          subscriptionNotification: { purchaseToken: "t", notificationType: type },
        }),
      );
      expect(e.action).toBe("reverify");
    }
  });

  it("🔴 모르는 종류도 재검증한다 — 무시하면 상태가 낡은 채로 남는다", () => {
    const e = parseRtdn(
      push({
        packageName: PKG,
        subscriptionNotification: { purchaseToken: "t", notificationType: 99 },
      }),
    );
    expect(e.action).toBe("reverify");
    expect(e.kind).toContain("UNKNOWN");
  });

  it("테스트 알림은 할 일이 없다", () => {
    const e = parseRtdn(push({ packageName: PKG, testNotification: { version: "1.0" } }));
    expect(e.action).toBe("ignore");
    expect(e.kind).toBe("TEST");
  });

  it("구매 토큰이 없으면 아무것도 안 한다", () => {
    const e = parseRtdn(
      push({ packageName: PKG, subscriptionNotification: { notificationType: 2 } }),
    );
    expect(e.action).toBe("ignore");
  });

  it("🔴 모양이 다르면 전부 무시 — 알 수 없는 알림에 반응해 남의 구독을 건드리지 않는다", () => {
    expect(parseRtdn(null).action).toBe("ignore");
    expect(parseRtdn({}).action).toBe("ignore");
    expect(parseRtdn({ message: {} }).action).toBe("ignore");
    expect(parseRtdn({ message: { data: "" } }).action).toBe("ignore");
    expect(parseRtdn({ message: { data: "!!!not-base64!!!" } }).action).toBe("ignore");
    expect(parseRtdn({ message: { data: Buffer.from("[]").toString("base64") } }).action).toBe(
      "ignore",
    );
    expect(
      parseRtdn({ message: { data: Buffer.from("깨진json{").toString("base64") } }).action,
    ).toBe("ignore");
  });

  it("환불 알림이 구독 알림보다 먼저 걸린다(둘 다 있는 경우)", () => {
    const e = parseRtdn(
      push({
        packageName: PKG,
        voidedPurchaseNotification: { purchaseToken: "voided" },
        subscriptionNotification: { purchaseToken: "sub", notificationType: 2 },
      }),
    );
    expect(e.action).toBe("revoke");
    expect(e.purchaseToken).toBe("voided");
  });

  it("알림 종류에 이름이 붙어 있다 — 로그에 12 라고만 남으면 아무도 모른다", () => {
    expect(SUBSCRIPTION_NOTIFICATION_NAMES[4]).toBe("PURCHASED");
    expect(SUBSCRIPTION_NOTIFICATION_NAMES[12]).toBe("REVOKED");
    expect(Object.keys(SUBSCRIPTION_NOTIFICATION_NAMES).length).toBeGreaterThan(10);
  });
});
