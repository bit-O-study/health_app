import { describe, expect, it } from "vitest";

import {
  PAID_PLANS,
  PLANS,
  PLAN_ORDER,
  SPONSORED_PLAN,
  aiTierForPlan,
  benefitsUpTo,
  hasPlan,
  higherPlan,
  isPlanId,
  planForProduct,
  planNetRevenueKrw,
} from "@/features/billing/plans";
import { PREMIUM_PRICE_KRW, PREMIUM_PRODUCT_ID } from "@/features/billing/products";
import { worstCaseMonthlyCostKrw } from "@/features/coach/ai-quota";

describe("요금제 표 (2026-09-30 사용자 결정)", () => {
  it("무료 · 라이트 990 · 베이직 3,900 · 플러스 6,900 · 프로 9,900", () => {
    expect(PLAN_ORDER).toEqual(["free", "lite", "basic", "plus", "pro"]);
    expect(PLANS.free.priceKrw).toBe(0);
    expect(PLANS.lite.priceKrw).toBe(990);
    expect(PLANS.lite.productId).toBe("helssu_lite_monthly");
    expect(PLANS.basic.priceKrw).toBe(3_900);
    expect(PLANS.plus.priceKrw).toBe(6_900);
    expect(PLANS.pro.priceKrw).toBe(9_900);
  });

  it("🔴 베이직은 예전 3,900원 상품 그대로다 — 상품 id 가 바뀌면 기존 구독이 끊긴다", () => {
    expect(PLANS.basic.productId).toBe(PREMIUM_PRODUCT_ID);
    expect(PLANS.basic.priceKrw).toBe(PREMIUM_PRICE_KRW);
  });

  it("유료 요금제마다 상품 id 가 있고 서로 다르다", () => {
    const ids = PAID_PLANS.map((p) => PLANS[p].productId);
    expect(ids.every((id) => typeof id === "string" && id.length > 0)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
    expect(PLANS.free.productId).toBeNull();
  });

  it("비쌀수록 가격이 올라간다", () => {
    for (let i = 1; i < PLAN_ORDER.length; i++) {
      expect(PLANS[PLAN_ORDER[i]].priceKrw).toBeGreaterThan(PLANS[PLAN_ORDER[i - 1]].priceKrw);
    }
  });
});

describe("상품 → 요금제", () => {
  it("상품 id 로 요금제를 찾는다", () => {
    expect(planForProduct("helssu_lite_monthly")).toBe("lite");
    expect(planForProduct("helssu_premium_monthly")).toBe("basic");
    expect(planForProduct("helssu_plus_monthly")).toBe("plus");
    expect(planForProduct("helssu_pro_monthly")).toBe("pro");
  });

  it("🔴 모르는 상품은 가장 낮은 유료(베이직) — 돈 낸 사람을 무료로 떨구지도, 안 산 걸 주지도 않는다", () => {
    expect(planForProduct("something_else")).toBe("basic");
    expect(planForProduct(null)).toBe("basic");
  });
});

describe("등급 비교", () => {
  it("높은 요금제는 낮은 요금제 혜택을 모두 가진다", () => {
    expect(hasPlan("pro", "plus")).toBe(true);
    expect(hasPlan("plus", "basic")).toBe(true);
    expect(hasPlan("basic", "plus")).toBe(false);
    expect(hasPlan("free", "basic")).toBe(false);
  });

  it("개인 구독과 트레이너·팀 요금제 중 높은 것", () => {
    expect(higherPlan("basic", SPONSORED_PLAN)).toBe("plus");
    expect(higherPlan("pro", SPONSORED_PLAN)).toBe("pro");
    expect(higherPlan("free", "free")).toBe("free");
  });

  it("트레이너·팀이 주는 요금제는 플러스(사용자 결정)", () => {
    expect(SPONSORED_PLAN).toBe("plus");
  });

  it("🔴 라이트는 AI 를 팔지 않는다 — 무료 칸. 베이직부터 프리미엄 칸", () => {
    expect(aiTierForPlan("free")).toBe("free");
    expect(aiTierForPlan("lite")).toBe("free");
    for (const p of ["basic", "plus", "pro"] as const) expect(aiTierForPlan(p)).toBe("premium");
  });

  it("isPlanId", () => {
    expect(isPlanId("plus")).toBe(true);
    expect(isPlanId("premium")).toBe(false);
  });
});

describe("혜택·단가", () => {
  it("위 요금제 혜택 목록은 아래 요금제 것을 포함한다", () => {
    const basic = benefitsUpTo("basic").map((b) => b.text);
    const pro = benefitsUpTo("pro").map((b) => b.text);
    for (const t of basic) expect(pro).toContain(t);
    expect(pro.length).toBeGreaterThan(basic.length);
  });

  it("🔴 유료 요금제 모두, 그 요금제의 AI 한도를 다 써도 실수령을 넘지 않는다", () => {
    for (const p of PAID_PLANS) {
      expect(worstCaseMonthlyCostKrw(aiTierForPlan(p)), `${p}`).toBeLessThan(planNetRevenueKrw(p));
    }
  });

  it("실수령: 990→765 · 3,900→3,013 · 6,900→5,331 · 9,900→7,650", () => {
    expect(planNetRevenueKrw("lite")).toBe(765);
    expect(planNetRevenueKrw("basic")).toBe(3013);
    expect(planNetRevenueKrw("plus")).toBe(5331);
    expect(planNetRevenueKrw("pro")).toBe(7650);
    expect(planNetRevenueKrw("free")).toBe(0);
  });
});

describe("판매 중인 요금제 (2026-10-01 사용자 결정)", () => {
  it("🔴 지금은 라이트(990원)만 판매 — 베이직·플러스·프로는 오픈 준비 중", () => {
    expect(PLANS.lite.onSale).toBe(true);
    expect(PLANS.basic.onSale).toBe(false);
    expect(PLANS.plus.onSale).toBe(false);
    expect(PLANS.pro.onSale).toBe(false);
  });
});
