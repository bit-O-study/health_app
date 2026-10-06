import { describe, expect, it } from "vitest";
import { COACH_PRICE_KRW, COACH_PRODUCT_ID, PREMIUM_PRICE_KRW, PREMIUM_PRODUCT_ID, PREMIUM_OPEN } from "@/features/billing/products";
import { isCoachEntitled, isPremiumEntitled, statusLabel, type SubscriptionRecord } from "@/features/billing/subscription";
import { validateCoachRequest } from "@/features/coach/manual-model";

const now = new Date("2026-10-01T00:00:00Z");
const sub: SubscriptionRecord = { productId: COACH_PRODUCT_ID, state: "active", expiresAt: "2026-11-01T00:00:00Z", autoRenewing: true };
describe("manual coaching subscription", () => {
  it("separates 990 coaching from unopened 3990 premium", () => {
    expect(COACH_PRICE_KRW).toBe(990); expect(PREMIUM_PRICE_KRW).toBe(3990); expect(PREMIUM_OPEN).toBe(false);
    expect(isCoachEntitled(sub, now)).toBe(true); expect(isPremiumEntitled(sub, now)).toBe(false);
    expect(statusLabel(sub, now)).toContain("헬쑤 코칭");
  });
  it("preserves existing premium rights", () => {
    const premium = { ...sub, productId: PREMIUM_PRODUCT_ID };
    expect(isPremiumEntitled(premium, now)).toBe(true); expect(isCoachEntitled(premium, now)).toBe(true);
  });
  it.each(["expired", "paused", "on_hold"] as const)("denies %s", state => { expect(isCoachEntitled({ ...sub, state }, now)).toBe(false); });
  it("denies missing, expired and unrelated purchases", () => {
    expect(isCoachEntitled(null, now)).toBe(false);
    expect(isCoachEntitled({ ...sub, expiresAt: now.toISOString() }, now)).toBe(false);
    expect(isCoachEntitled({ ...sub, productId: "other" }, now)).toBe(false);
  });
  it("keeps paid-through access after cancellation", () => { expect(isCoachEntitled({ ...sub, state: "canceled" }, now)).toBe(true); });
  it("validates consultation without requiring optional recommendation notes", () => {
    expect(validateCoachRequest("consultation", " ")).toBeTruthy();
    expect(validateCoachRequest("consultation", "운동 순서가 궁금해요")).toBeNull();
    expect(validateCoachRequest("recommendation", "")).toBeNull();
    expect(validateCoachRequest("habit-report", "a".repeat(2001))).toBeTruthy();
    expect(validateCoachRequest("invalid", "abc")).toBeTruthy();
  });
});
