/**
 * 요금제 — 2026-09-30 AI 트레이너 요금제 1단계(`docs/ai-trainer-plans-2026-09-30.html`).
 *
 * 순수 모듈(DB·서버 의존 없음). 무엇을 파는지·얼마인지·어느 상품이 어느 요금제인지만 안다.
 * 누가 어느 요금제인지 판정하는 일은 `plan-store.ts` 가 한다.
 *
 * 🔴 요금제는 **구독한 상품 id** 에서 나온다. 예전 3,900원 상품(`helssu_premium_monthly`)은
 * 그대로 베이직이다 — 상품 id 를 바꾸면 이미 구독한 사람의 결제가 끊긴다.
 */
import { netRevenueKrw } from "@/features/billing/products";
import type { AiTier } from "@/features/coach/ai-quota";

export type PlanId = "free" | "lite" | "basic" | "plus" | "pro";

/** 싼 것부터 — 순서가 곧 등급이다(위 요금제는 아래 요금제 혜택을 모두 가진다). */
export const PLAN_ORDER: readonly PlanId[] = ["free", "lite", "basic", "plus", "pro"];

export type PlanBenefit = {
  text: string;
  /** 아직 만들지 않은 혜택은 화면에 '곧 제공'으로 표시한다 — 없는 걸 있는 척 팔지 않는다. */
  ready: boolean;
};

export type PlanMeta = {
  id: PlanId;
  label: string;
  /** 월 표시 가격(원, 부가세 포함). 실제 청구 가격은 플레이 콘솔이 정한다 — 바꾸면 여기도. */
  priceKrw: number;
  /** 플레이 콘솔 구독 상품 id. 글자 하나까지 같아야 한다. 무료는 null. */
  productId: string | null;
  tagline: string;
  /** 이 요금제에서 **새로** 생기는 혜택(아래 요금제 것은 다시 적지 않는다). */
  benefits: readonly PlanBenefit[];
  /**
   * 지금 새로 살 수 있나. false 면 구독 화면에 "오픈 준비 중"만 보이고 시작 버튼이 없다.
   * 이미 구독 중인 사람·트레이너 연결 회원의 혜택은 그대로다(판매만 멈춤).
   * 사용자 결정(2026-10-01): 지금은 라이트(990원)만 판매 — 나머지는 나중에 연다.
   */
  onSale: boolean;
};

export const PLANS: Record<PlanId, PlanMeta> = {
  free: {
    id: "free",
    label: "무료",
    priceKrw: 0,
    productId: null,
    tagline: "기록하고 규칙으로 추천받기",
    onSale: false,
    benefits: [
      { text: "운동·식단·수분·몸무게 기록", ready: true },
      { text: "규칙 기반 루틴 추천", ready: true },
      { text: "카메라로 횟수 세기", ready: true },
    ],
  },
  /**
   * 라이트 990원(2026-10-01, `docs/sub-muscle-score-lite-plan-2026-10-01.html`).
   * **AI 없이** 내 기록으로 만드는 리포트·규칙 추천만 — 원가 0원. AI 사용 횟수는 무료와 같다
   * (`aiTierForPlan` 참고). 무료와 베이직(AI) 사이에서 '처음 결제해 보는' 입구.
   */
  lite: {
    id: "lite",
    label: "라이트",
    priceKrw: 990,
    productId: "helssu_lite_monthly",
    tagline: "내 기록으로 보는 세부 부위 리포트",
    onSale: true,
    benefits: [
      { text: "맞춤 운동 앱: 세부 부위 25개 점수 리포트", ready: true },
      // 사용자 결정(2026-10-01): 라이트 추천은 **오늘만 운동 변경으로만** 적용 — 루틴은 안 바꾼다.
      { text: "모자란 세부 부위를 채우는 맞춤 운동 추천(오늘만 운동 변경으로 적용)", ready: true },
      { text: "균형·종목별 성장·월간 리포트", ready: true },
    ],
  },
  basic: {
    id: "basic",
    label: "베이직",
    priceKrw: 3_900,
    productId: "helssu_premium_monthly",
    tagline: "매일 오늘 운동을 짜 주는 AI 트레이너",
    onSale: false,
    benefits: [
      { text: "AI 기능 사용 횟수 늘리기", ready: true },
      { text: "AI 트레이너 탭: 오늘의 운동 제안 → 적용하면 오늘만 변경", ready: false },
      { text: "AI 식단 관리(하루 목표·저녁 피드백)", ready: false },
      { text: "AI 다짐 추천", ready: false },
    ],
  },
  plus: {
    id: "plus",
    label: "플러스",
    priceKrw: 6_900,
    productId: "helssu_plus_monthly",
    tagline: "루틴까지 손보는 AI 트레이너",
    onSale: false,
    benefits: [
      { text: "주 1회 루틴 점검(확인하면 루틴에 반영)", ready: false },
      { text: "4주 목표 리포트", ready: false },
    ],
  },
  pro: {
    id: "pro",
    label: "프로",
    priceKrw: 9_900,
    productId: "helssu_pro_monthly",
    tagline: "자세까지 봐 주는 AI 트레이너",
    onSale: false,
    benefits: [{ text: "AI 자세 코칭 상세(구간별 교정, 글·음성)", ready: false }],
  },
};

export const PAID_PLANS: readonly PlanId[] = ["lite", "basic", "plus", "pro"];

export function isPlanId(v: unknown): v is PlanId {
  return typeof v === "string" && (PLAN_ORDER as readonly string[]).includes(v);
}

export function planRank(p: PlanId): number {
  return PLAN_ORDER.indexOf(p);
}

/** 둘 중 높은 요금제. 개인 구독·팀 구독·트레이너 연결을 합칠 때 쓴다. */
export function higherPlan(a: PlanId, b: PlanId): PlanId {
  return planRank(a) >= planRank(b) ? a : b;
}

/** `current` 가 `min` 이상인가 — 기능 게이트용. */
export function hasPlan(current: PlanId, min: PlanId): boolean {
  return planRank(current) >= planRank(min);
}

/**
 * 구독 상품 id → 요금제.
 *
 * 모르는 상품 id 는 **베이직**으로 본다. 결제는 됐는데(서버가 구글에 확인함) 우리 표에 없는
 * 상품이라면, 무료로 떨어뜨리면 돈 낸 사람이 아무것도 못 받고, 위 요금제로 올리면 안 산 걸
 * 준다. 가장 낮은 유료 등급이 둘 다 피한다.
 */
export function planForProduct(productId: string | null | undefined): PlanId {
  for (const p of PAID_PLANS) {
    if (PLANS[p].productId === productId) return p;
  }
  return "basic";
}

/**
 * 트레이너 정액권·팀 구독(트레이너·헬스장)이 회원에게 주는 요금제 — 사용자 결정(2026-09-30).
 * 루틴은 트레이너도 손보므로 플러스까지. 자세 코칭 상세(프로)는 트레이너의 일이다.
 */
export const SPONSORED_PLAN: PlanId = "plus";

/** 기존 AI 사용 한도(무료/프리미엄 두 칸)에 어느 칸을 쓰는가. 베이직부터 프리미엄 칸이다. */
export function aiTierForPlan(p: PlanId): AiTier {
  // 라이트는 AI 를 팔지 않는다 — 무료와 같은 칸(원가 0원 유지).
  return p === "free" || p === "lite" ? "free" : "premium";
}

/** 요금제의 실수령(원) — 부가세 빼고 플레이 수수료 뗀 값. 무료는 0. */
export function planNetRevenueKrw(p: PlanId): number {
  return p === "free" ? 0 : netRevenueKrw(PLANS[p].priceKrw);
}

/** 이 요금제에서 쓸 수 있는 혜택 전부(아래 요금제 것 포함), 싼 요금제 것부터. */
export function benefitsUpTo(p: PlanId): PlanBenefit[] {
  return PLAN_ORDER.slice(0, planRank(p) + 1).flatMap((id) => [...PLANS[id].benefits]);
}
