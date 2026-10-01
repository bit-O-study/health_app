import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/features/billing/actions", () => ({ verifyPurchaseAction: vi.fn() }));
vi.mock("@/features/billing/play-billing-native", () => ({ purchaseSubscription: vi.fn(), restorePurchase: vi.fn() }));
vi.mock("@/features/coach/manual-actions", () => ({ requestManualCoach: vi.fn() }));
import { SubscriptionPanel } from "@/features/billing/components/subscription-panel";
import { ManualCoachPanel } from "@/features/coach/components/manual-coach-panel";

describe("coaching and coming-soon UI", () => {
  it("disables premium even when payment verification is configured", () => {
    const html = renderToStaticMarkup(createElement(SubscriptionPanel, { initial: { premium: false, coaching: false, coachingReady: true, ready: true, label: "무료", expiresAt: null } }));
    expect(html).toContain("3,990");
    expect(html).toContain("990");
    expect(html).toMatch(/data-testid="subscribe-button"[^>]* disabled=""/);
    expect(html).not.toMatch(/data-testid="coach-subscribe-button"[^>]* disabled=""/);
    expect(html).toContain("오픈 준비 중");
  });
  it("prevents charging before coaching is ready", () => {
    const html = renderToStaticMarkup(createElement(SubscriptionPanel, { initial: { premium: false, coaching: false, coachingReady: false, ready: true, label: "무료", expiresAt: null } }));
    expect(html).toMatch(/data-testid="coach-subscribe-button"[^>]* disabled=""/);
  });
  it("retains answers after expiry without a request form, escaping submitted HTML", () => {
    const html = renderToStaticMarkup(createElement(ManualCoachPanel, { active: false, rows: [{ id: "r", kind: "consultation", for_date: "2026-10-01", created_at: "2026-10-01", question: "질문", answer: "<script>alert(1)</script>", answered_at: "2026-10-01" }] }));
    expect(html).not.toContain("<form");
    expect(html).not.toContain("<script>");
    expect(html).toContain("답변 완료");
    expect(html).toContain("&lt;script&gt;");
  });
});

it("shows practical recommendation selectors only to active coaching members", () => {
  const html = renderToStaticMarkup(createElement(ManualCoachPanel, { active: true, rows: [] }));
  expect(html).toContain('aria-label="가능한 시간"');
  expect(html).toContain('aria-label="사용할 기구"');
  expect(html).toContain("대체 운동 찾기");
  expect(html).toContain("정체 점검");
  const expired = renderToStaticMarkup(createElement(ManualCoachPanel, { active: false, rows: [] }));
  expect(expired).not.toContain('aria-label="가능한 시간"');
});