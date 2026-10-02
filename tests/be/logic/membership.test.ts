import { describe, expect, it } from "vitest";

import {
  FREE_TRIAL_DAYS,
  benefitsUsedLine,
  cancelNotice,
  downgradeOf,
  membershipView,
  playManageUrl,
} from "@/features/billing/membership";
import type { SubscriptionRecord } from "@/features/billing/subscription";

const NOW = new Date("2026-09-30T03:00:00Z");
const rec = (p: Partial<SubscriptionRecord>): SubscriptionRecord => ({
  productId: "helssu_premium_monthly",
  state: "active",
  expiresAt: "2026-10-30T03:00:00Z",
  autoRenewing: true,
  ...p,
});

describe("멤버십 카드(배민클럽식)", () => {
  it("자동 갱신 중이면 다음 결제일과 금액, 해지 가능", () => {
    const v = membershipView(rec({}), "basic", NOW);
    expect(v.kind).toBe("renewing");
    expect(v.nextLine).toBe("다음 결제 2026년 10월 30일 · 월 3,900원");
    expect(v.canCancel).toBe(true);
  });

  it("요금제 가격을 쓴다(플러스 6,900원)", () => {
    expect(membershipView(rec({ productId: "helssu_plus_monthly" }), "plus", NOW).nextLine).toContain("월 6,900원");
  });

  it("🔴 해지했으면 끝나는 날까지 이용 — 해지 버튼은 다시 안 보인다", () => {
    const v = membershipView(rec({ state: "canceled", autoRenewing: false }), "basic", NOW);
    expect(v.kind).toBe("ending");
    expect(v.nextLine).toBe("2026년 10월 30일까지 이용하고 끝나요.");
    expect(v.canCancel).toBe(false);
  });

  it("결제 실패 유예 중엔 이용은 유지하고 결제 수단 확인을 안내", () => {
    const v = membershipView(rec({ state: "grace" }), "basic", NOW);
    expect(v.kind).toBe("grace");
    expect(v.nextLine).toContain("이용은 계속돼요");
  });

  it("결제 보류면 이용 불가 + 조치 안내", () => {
    const v = membershipView(rec({ state: "on_hold" }), "free", NOW);
    expect(v.kind).toBe("blocked");
    expect(v.nextLine).toContain("구글 플레이");
  });

  it("만료됐거나 구독이 없으면 none", () => {
    expect(membershipView(rec({ expiresAt: "2026-09-01T00:00:00Z" }), "free", NOW).kind).toBe("none");
    expect(membershipView(null, "free", NOW).kind).toBe("none");
  });
});

describe("해지 안내", () => {
  it("잃는 혜택은 지금 쓸 수 있는 것만 — '곧 제공'으로 겁주지 않는다", () => {
    const n = cancelNotice("basic", "2026-10-30T03:00:00Z");
    expect(n.until).toBe("2026년 10월 30일");
    // 베이직을 해지하면 라이트 혜택(이미 만든 것)과 베이직 혜택을 함께 잃는다.
    expect(n.lose).toEqual([
      "맞춤 운동 앱: 세부 부위 25개 점수 리포트",
      "모자란 세부 부위를 채우는 맞춤 운동 추천(오늘만 운동 변경으로 적용)",
      "균형·종목별 성장·월간 리포트",
      "내 데이터 리포트: 체성분 변화·컨디션·식단 월간·수분/걸음 주간",
      "홈 홍보 배너 없음",
      "커뮤니티 이름 옆 라이트 배지",
      "새 기능 먼저 써 보기",
      "3개월 목표 3개 · 진행률·예상 도달일",
      "몸 사진 비교(무제한, 나만 보기)",
      "일요일 저녁 이번 주 정리 알림",
      "아픈 부위 운동을 오늘만 다른 운동으로 바로 바꾸기",
      "1년 돌아보기(운동 잔디·한 해 숫자·공유 이미지)",
      "AI 기능 사용 횟수 늘리기",
    ]);
  });

  it("한 단계 낮은 요금제를 권한다(라이트는 없음)", () => {
    expect(downgradeOf("pro")).toBe("plus");
    expect(downgradeOf("plus")).toBe("basic");
    expect(downgradeOf("basic")).toBe("lite");
    expect(downgradeOf("lite")).toBeNull();
    expect(cancelNotice("plus", null).downgrade).toBe("basic");
  });
});

describe("구글 플레이 구독 관리 주소", () => {
  it("상품·패키지를 주면 그 구독 화면으로", () => {
    expect(playManageUrl("com.heltch.health", "helssu_plus_monthly")).toBe(
      "https://play.google.com/store/account/subscriptions?sku=helssu_plus_monthly&package=com.heltch.health",
    );
  });
  it("모르면 구독 목록으로", () => {
    expect(playManageUrl("", null)).toBe("https://play.google.com/store/account/subscriptions");
  });
});

describe("받은 혜택 한 줄", () => {
  it("0회면 보여 주지 않는다", () => {
    expect(benefitsUsedLine(0)).toBe("");
    expect(benefitsUsedLine(7)).toBe("이번 달 AI 트레이너·분석을 7번 썼어요.");
  });

  it("첫 달 무료 일수는 플레이 콘솔 제안과 맞춘 값(30일)", () => {
    expect(FREE_TRIAL_DAYS).toBe(30);
  });
});
