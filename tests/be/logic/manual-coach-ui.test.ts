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
  // 2026-10-05 병합: 990원은 라이트 하나(상담함 포함). 준비 중인 AI 요금제(3,990원)는 한 줄, 상담함은 구독자에게만.
  const base = {
    premium: false, coaching: false, coachingReady: true, ready: true, label: "무료", expiresAt: null,
    plan: "free" as const, personalPlan: "free" as const, sponsored: false,
    membership: { kind: "free" as const, nextLine: "", canCancel: false },
    manageUrl: "", aiUsesThisMonth: 0,
  };
  it("구독 전: 라이트를 살 수 있고, AI 요금제는 3,990원 준비 중 한 줄, 상담함 버튼은 없다", () => {
    const html = renderToStaticMarkup(createElement(SubscriptionPanel, { initial: base as never }));
    expect(html).toContain("월 990원");
    expect(html).toContain("3,990원 · 오픈 준비 중");
    expect(html).toContain('data-testid="plan-ai-soon"');
    expect(html).toContain('data-testid="subscribe-lite"');
    expect(html).not.toContain('data-testid="open-consult"');
    expect(html).not.toContain('data-testid="plan-basic"');
  });
  it("라이트 구독자에게만 짧은 '상담함' 버튼", () => {
    const html = renderToStaticMarkup(
      createElement(SubscriptionPanel, { initial: { ...base, premium: true, coaching: true, plan: "lite", personalPlan: "lite" } as never }),
    );
    expect(html).toContain('data-testid="open-consult"');
    expect(html).toContain('href="/coach/manual"');
    expect(html).toContain(">상담함<");
    expect(html).not.toContain('data-testid="subscribe-lite"');
  });
  it("결제 설정 전엔 결제 버튼이 없다", () => {
    const html = renderToStaticMarkup(createElement(SubscriptionPanel, { initial: { ...base, ready: false, coachingReady: false } as never }));
    expect(html).not.toContain('data-testid="subscribe-lite"');
    expect(html).toContain('data-testid="subscription-not-ready"');
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