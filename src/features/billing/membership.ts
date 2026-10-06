/**
 * 멤버십 화면 규칙 — 배민클럽처럼(2026-09-30 사용자 요청 "구독하는 로직은 배민처럼").
 *
 * 순수 모듈. 구독 기록 한 줄을 "지금 뭘 보여 줄지"로 바꾼다.
 *  - 가입 전: 혜택 요약 · 첫 달 무료 · 언제든 해지(해지해도 기간 끝까지)
 *  - 가입 후: 멤버십 카드 — 요금제, 다음 결제일·금액(또는 끝나는 날), 이번 달 받은 혜택
 *  - 해지: 바로 끊지 않고 먼저 안내 — 잃는 혜택, 이용 가능한 날, 한 단계 낮은 요금제 제안
 *
 * 🔴 실제 결제·해지는 구글 플레이가 한다(안드로이드 앱 안 디지털 구독 정책). 우리는
 *    안내하고 플레이 구독 관리 화면으로 보낸다. 해지 버튼이 우리 서버에서 뭔가를 끊지 않는다.
 */
import { formatUntil, isEntitled, type SubscriptionRecord } from "@/features/billing/subscription";
import { PLANS, PLAN_ORDER, planRank, type PlanId, AI_OPEN } from "@/features/billing/plans";

/**
 * 첫 구독 무료 체험 일수 — **플레이 콘솔의 신규 구독자 제안(offer)과 같아야 한다.**
 * 콘솔에 제안이 없는데 화면에 "첫 달 무료"를 쓰면 거짓 광고다. 제안을 없애면 0 으로.
 * 체험 자격(처음 구독하는 계정인가)은 구글이 판단한다 — 화면 문구도 "처음이면"이라고 쓴다.
 */
export const FREE_TRIAL_DAYS = 30;

export type MembershipKind =
  /** 구독 없음(또는 끝남). */
  | "none"
  /** 자동 갱신 중. */
  | "renewing"
  /** 해지했지만 기간이 남음. */
  | "ending"
  /** 결제 실패, 구글이 재시도 중(이용은 유지). */
  | "grace"
  /** 결제 보류·일시정지 — 이용 불가, 조치 필요. */
  | "blocked";

export type MembershipView = {
  kind: MembershipKind;
  /** 카드 둘째 줄 — 다음에 무슨 일이 일어나는지. */
  nextLine: string;
  /** 해지 버튼을 보여 줄지(자동 갱신 중일 때만). */
  canCancel: boolean;
};

export function membershipView(
  rec: SubscriptionRecord | null,
  plan: PlanId,
  now: Date = new Date(),
): MembershipView {
  if (!rec) return { kind: "none", nextLine: "", canCancel: false };
  const until = formatUntil(rec.expiresAt);
  if (!isEntitled(rec, now)) {
    if (rec.state === "on_hold") {
      return { kind: "blocked", nextLine: "결제가 보류됐어요. 구글 플레이에서 결제 수단을 바꿔 주세요.", canCancel: false };
    }
    if (rec.state === "paused") {
      return { kind: "blocked", nextLine: "구독을 잠시 멈춘 상태예요. 구글 플레이에서 다시 시작할 수 있어요.", canCancel: false };
    }
    return { kind: "none", nextLine: "", canCancel: false };
  }
  if (rec.state === "grace") {
    return {
      kind: "grace",
      nextLine: "결제가 확인되지 않았어요. 결제 수단을 확인해 주세요. 그동안 이용은 계속돼요.",
      canCancel: false,
    };
  }
  if (rec.state === "canceled" || !rec.autoRenewing) {
    return { kind: "ending", nextLine: `${until}까지 이용하고 끝나요.`, canCancel: false };
  }
  const price = PLANS[plan].priceKrw.toLocaleString("ko-KR");
  return { kind: "renewing", nextLine: `다음 결제 ${until} · 월 ${price}원`, canCancel: true };
}

/** 한 단계 낮은 유료 요금제(해지 대신 권할 것). 베이직이면 없음. */
export function downgradeOf(plan: PlanId): PlanId | null {
  const i = planRank(plan);
  return i >= 2 ? PLAN_ORDER[i - 1] : null;
}

/**
 * 해지 안내 — 해지하면 잃는 것과 언제까지 쓸 수 있는지. 잃는 것은 **지금 쓸 수 있는**
 * 혜택만 적는다('곧 제공'을 잃는다고 겁주지 않는다).
 */
export function cancelNotice(plan: PlanId, expiresAt: string | null) {
  const lose = PLAN_ORDER.slice(1, planRank(plan) + 1)
    .flatMap((id) => PLANS[id].benefits)
    .filter((b) => b.ready)
    .map((b) => b.text);
  return {
    until: formatUntil(expiresAt),
    lose,
    downgrade: downgradeOf(plan),
  };
}

/**
 * 구글 플레이 구독 관리 화면 주소 — 해지·결제 수단 변경은 여기서만 된다.
 * 상품 id 를 주면 그 구독 화면으로 바로 간다.
 */
export function playManageUrl(packageName: string, productId: string | null): string {
  const base = "https://play.google.com/store/account/subscriptions";
  if (!packageName || !productId) return base;
  return `${base}?sku=${encodeURIComponent(productId)}&package=${encodeURIComponent(packageName)}`;
}

/** 이번 달 받은 혜택 한 줄 — 배민클럽의 '이번 달 아낀 금액' 자리. 0이면 빈 문자열. */
export function benefitsUsedLine(aiUsesThisMonth: number, aiOpen: boolean = AI_OPEN): string {
  // AI 가 닫혀 있는 동안(2026-10-01~)엔 AI 사용 횟수를 말하지 않는다.
  if (!aiOpen) return "";
  if (!Number.isFinite(aiUsesThisMonth) || aiUsesThisMonth <= 0) return "";
  return `이번 달 AI 트레이너·분석을 ${Math.floor(aiUsesThisMonth)}번 썼어요.`;
}
