import { describe, expect, it } from "vitest";

import {
  formatUntil,
  isEntitled,
  mapPlayState,
  pickAutoRenewing,
  pickExpiry,
  pickProductId,
  statusLabel,
  type SubscriptionRecord,
  type SubscriptionState,
} from "@/features/billing/subscription";

const NOW = new Date("2026-09-02T05:00:00Z");
const future = "2026-10-01T00:00:00Z";
const past = "2026-08-01T00:00:00Z";

const rec = (
  state: SubscriptionState,
  expiresAt: string | null = future,
): SubscriptionRecord => ({
  productId: "helssu_premium_monthly",
  state,
  expiresAt,
  autoRenewing: true,
});

describe("mapPlayState — 구글 상태를 우리 상태로", () => {
  it("아는 상태는 그대로 옮긴다", () => {
    expect(mapPlayState("SUBSCRIPTION_STATE_ACTIVE")).toBe("active");
    expect(mapPlayState("SUBSCRIPTION_STATE_IN_GRACE_PERIOD")).toBe("grace");
    expect(mapPlayState("SUBSCRIPTION_STATE_CANCELED")).toBe("canceled");
    expect(mapPlayState("SUBSCRIPTION_STATE_ON_HOLD")).toBe("on_hold");
    expect(mapPlayState("SUBSCRIPTION_STATE_PAUSED")).toBe("paused");
    expect(mapPlayState("SUBSCRIPTION_STATE_EXPIRED")).toBe("expired");
  });

  it("🔴 모르는 값은 만료로 본다 — 모르는 상태에 권한을 주면 안 된다", () => {
    expect(mapPlayState("SUBSCRIPTION_STATE_PENDING")).toBe("expired");
    expect(mapPlayState("SUBSCRIPTION_STATE_UNSPECIFIED")).toBe("expired");
    expect(mapPlayState("무언가새로생긴상태")).toBe("expired");
    expect(mapPlayState(undefined)).toBe("expired");
    expect(mapPlayState(42)).toBe("expired");
  });
});

describe("isEntitled — 지금 프리미엄인가", () => {
  it("기록이 없으면 무료", () => {
    expect(isEntitled(null, NOW)).toBe(false);
  });

  it("정상 결제 중이고 기간이 남았으면 프리미엄", () => {
    expect(isEntitled(rec("active"), NOW)).toBe(true);
  });

  it("🔴 결제 유예(grace)에도 접근을 유지한다 — 재시도 중에 막으면 안 된다", () => {
    expect(isEntitled(rec("grace"), NOW)).toBe(true);
  });

  it("🔴 해지해도 이미 낸 기간까지는 쓴다", () => {
    expect(isEntitled(rec("canceled", future), NOW)).toBe(true);
  });

  it("해지하고 기간도 끝났으면 무료", () => {
    expect(isEntitled(rec("canceled", past), NOW)).toBe(false);
  });

  it("🔴 만료 시각이 항상 이긴다 — 'active' 라도 지났으면 권한 없음", () => {
    // 갱신 소식을 놓쳐 기록이 낡은 채로 남아 있을 수 있다. 그때 글자만 믿으면
    // 돈 안 낸 사람이 계속 쓰게 된다.
    expect(isEntitled(rec("active", past), NOW)).toBe(false);
    expect(isEntitled(rec("grace", past), NOW)).toBe(false);
  });

  it("결제 보류·일시정지는 기간이 남아도 막는다", () => {
    expect(isEntitled(rec("on_hold", future), NOW)).toBe(false);
    expect(isEntitled(rec("paused", future), NOW)).toBe(false);
  });

  it("🔴 만료 시각을 모르면 권한 없음 — 모르면 주지 않는다", () => {
    expect(isEntitled(rec("active", null), NOW)).toBe(false);
    expect(isEntitled(rec("active", "아무말"), NOW)).toBe(false);
  });

  it("만료 순간에는 이미 권한이 없다(경계)", () => {
    const exact = new Date(future);
    expect(isEntitled(rec("active", future), exact)).toBe(false);
    expect(isEntitled(rec("active", future), new Date(exact.getTime() - 1))).toBe(
      true,
    );
  });
});

describe("statusLabel — 사용자가 지금 뭘 해야 하는지", () => {
  it("무료", () => {
    expect(statusLabel(null, NOW)).toBe("무료 이용 중");
  });

  it("정상 이용 중이면 언제까지인지 알려준다", () => {
    expect(statusLabel(rec("active"), NOW)).toContain("10월 1일");
  });

  it("🔴 유예 상태는 '지금 이용된다'만 말하지 않는다 — 안 알리면 어느 날 갑자기 막힌다", () => {
    const s = statusLabel(rec("grace"), NOW);
    expect(s).toContain("결제");
    expect(s).toContain("유지");
  });

  it("해지 예정은 언제까지 쓸 수 있는지", () => {
    expect(statusLabel(rec("canceled"), NOW)).toContain("해지 예정");
  });

  it("결제 보류는 무엇을 해야 하는지 알려준다", () => {
    expect(statusLabel(rec("on_hold", past), NOW)).toContain("구글 플레이");
  });

  it("만료된 활성 기록은 그냥 무료로 보인다", () => {
    expect(statusLabel(rec("active", past), NOW)).toBe("무료 이용 중");
  });
});

describe("formatUntil — 서울 기준 날짜", () => {
  it("한국 날짜로 적는다", () => {
    // 2026-10-01T00:00Z = 서울 10월 1일 09:00
    expect(formatUntil("2026-10-01T00:00:00Z")).toBe("2026년 10월 1일");
  });

  it("🔴 UTC 로 적으면 하루 어긋난다 — 자정 직전 만료", () => {
    // 2026-09-30T16:00Z = 서울 10월 1일 01:00
    expect(formatUntil("2026-09-30T16:00:00Z")).toBe("2026년 10월 1일");
  });

  it("모르면 빈 문자열", () => {
    expect(formatUntil(null)).toBe("");
    expect(formatUntil("아무말")).toBe("");
  });
});

describe("구글 응답 읽기", () => {
  const items = [
    { productId: "old_plan", expiryTime: "2026-09-03T00:00:00Z" },
    {
      productId: "helssu_premium_monthly",
      expiryTime: "2026-10-01T00:00:00Z",
      autoRenewingPlan: { autoRenewEnabled: true },
    },
  ];

  it("🔴 만료는 가장 늦은 것 — 업그레이드 직후엔 옛 상품이 잠시 함께 있다", () => {
    expect(pickExpiry(items)).toBe(new Date("2026-10-01T00:00:00Z").toISOString());
  });

  it("상품 id 는 첫 번째", () => {
    expect(pickProductId(items)).toBe("old_plan");
  });

  it("자동 갱신은 하나라도 켜져 있으면 true", () => {
    expect(pickAutoRenewing(items)).toBe(true);
    expect(pickAutoRenewing([{ productId: "x" }])).toBe(false);
  });

  it("모양이 다르면 안전한 기본값 — 응답 형식이 바뀌어도 안 터진다", () => {
    expect(pickExpiry(null)).toBeNull();
    expect(pickExpiry("글자")).toBeNull();
    expect(pickExpiry([{ expiryTime: 12 }])).toBeNull();
    expect(pickExpiry([{ expiryTime: "아무말" }])).toBeNull();
    expect(pickProductId(undefined)).toBe("");
    expect(pickAutoRenewing({})).toBe(false);
  });
});
