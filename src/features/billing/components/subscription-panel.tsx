"use client";

import { useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, Loader2, MessageCircle, RotateCcw } from "lucide-react";

import {
  verifyPurchaseAction,
  type BillingStatus,
} from "@/features/billing/actions";
import {
  purchaseSubscription,
  restorePurchase,
} from "@/features/billing/play-billing-native";
import { AI_OPEN, PAID_PLANS, PLANS, PLAN_ORDER, type PlanId } from "@/features/billing/plans";
import { AI_FEATURES, MONTHLY_LIMITS } from "@/features/coach/ai-quota";
import { MembershipCard } from "@/features/billing/components/membership-card";

/**
 * 구독 화면 — 로드맵 7.1 · 2026-09-30 요금제 4단계(무료·베이직·플러스·프로).
 *
 * 흐름: 앱이 결제창을 띄워 **구매 토큰만** 받아 오고 → 서버가 구글에 물어 확인한 뒤
 * 권한을 준다. 화면은 토큰을 해석하지 않는다.
 */
export function SubscriptionPanel({ initial }: { initial: BillingStatus }) {
  const router = useRouter();
  const [status, setStatus] = useState(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function run(get: () => Promise<
    | { ok: true; purchaseToken: string }
    | { ok: false; reason: "cancelled" | "unavailable"; message?: string }
  >) {
    setMsg(null);
    start(async () => {
      const bought = await get();
      if (!bought.ok) {
        // 사용자가 닫은 건 오류가 아니다 — 빨간 글씨를 띄우지 않는다.
        if (bought.reason !== "cancelled") setMsg(bought.message ?? null);
        return;
      }
      const verified = await verifyPurchaseAction(bought.purchaseToken);
      if (!verified.ok) return setMsg(verified.error);
      setStatus(verified.status);
      setMsg("구독이 확인됐어요.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* 배민클럽처럼 — 가입 전엔 무료·첫 달 무료, 가입 후엔 멤버십 카드(다음 결제·받은 혜택·해지). */}
      <MembershipCard status={status} />

      {/*
        🔴 무엇을 사는지 **여기서** 보여 준다. 값을 모르는 걸 누가 결제하지 않는다.
        아직 만들지 않은 혜택은 '곧 제공'으로 표시한다 — 없는 걸 있는 척 팔지 않는다.
      */}
      <section data-testid="plan-list" className="space-y-2">
        <h2 className="app-section-label">요금제</h2>
        {/* 파는 요금제만 카드로(지금은 라이트). 준비 중인 AI 요금제는 아래 한 줄 — 팔지 않는 카드가 화면을 덮었다(2026-10-05). */}
        {PAID_PLANS.filter((id) => PLANS[id].onSale || status.plan === id).map((id) => (
          <PlanCard
            key={id}
            id={id}
            active={status.plan === id}
            canBuy={status.ready && status.personalPlan === "free" && PLANS[id].onSale}
            pending={pending}
            extra={
              // 상담함은 구독한 사람에게만 — 구독 전엔 버튼이 없다(누를 수 없는 버튼을 켜 두지 않는다).
              id === "lite" && status.coaching ? (
                <Link
                  href="/coach/manual"
                  data-testid="open-consult"
                  className="app-press flex h-11 items-center justify-between rounded-xl bg-brand-soft px-3 text-sm font-semibold text-brand"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <MessageCircle aria-hidden="true" size={16} />
                    상담함
                  </span>
                  <ChevronRight aria-hidden="true" size={16} />
                </Link>
              ) : null
            }
            onBuy={() => {
              const productId = PLANS[id].productId;
              if (productId) run(() => purchaseSubscription(productId));
            }}
          />
        ))}
        {!AI_OPEN ? (
          <p
            data-testid="plan-ai-soon"
            className="flex items-center justify-between rounded-xl border border-dashed border-line px-3 py-2.5 text-sm text-zinc-500 dark:text-zinc-400"
          >
            <span>AI 요금제</span>
            <span className="tabular-nums">월 {PLANS.basic.priceKrw.toLocaleString("ko-KR")}원 · 오픈 준비 중</span>
          </p>
        ) : null}
        {status.personalPlan !== "free" ? (
          <p className="px-1 text-xs text-zinc-500 dark:text-zinc-400">
            요금제를 바꾸려면 구글 플레이 구독 관리에서 지금 구독을 해지한 뒤 다시 골라 주세요.
          </p>
        ) : null}
      </section>

      {/* AI 가 닫혀 있는 동안(AI_OPEN=false)엔 AI 횟수 표를 안 보인다 — 못 쓰는 걸 숫자로 팔지 않는다. */}
      {AI_OPEN ? (
      <section data-testid="premium-benefits">
        <div className="flex items-baseline justify-between">
          <h2 className="app-section-label">한 달에 쓸 수 있는 AI 횟수</h2>
          <span className="mb-1.5 px-1 text-xs text-zinc-500 dark:text-zinc-400">
            유료 요금제 공통 · 언제든 해지
          </span>
        </div>
        <ul className="app-list">
          <li className="flex items-center justify-between gap-2 px-3 py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            <span>기능</span>
            <span className="flex gap-6">
              <span className="w-10 text-right">무료</span>
              <span className="w-12 text-right text-brand">유료</span>
            </span>
          </li>
          {AI_FEATURES.map((f) => (
            <li
              key={f.id}
              className="flex min-h-10 items-center justify-between gap-2 px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200"
            >
              <span className="min-w-0 truncate">{f.label}</span>
              <span className="flex shrink-0 gap-6 tabular-nums">
                <span className="w-10 text-right text-zinc-500">{MONTHLY_LIMITS.free[f.id]}</span>
                <span className="w-12 text-right font-semibold text-brand">
                  {MONTHLY_LIMITS.premium[f.id]}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>
      ) : null}

      {!status.ready ? (
        // 설정이 안 된 걸 오류처럼 보여주면 사용자가 자기 잘못인 줄 안다.
        <p
          data-testid="subscription-not-ready"
          className="app-card p-3 text-sm text-zinc-600 dark:text-zinc-300"
        >
          구독은 아직 준비 중이에요.
        </p>
      ) : (
        // 기기를 바꾸거나 다시 깔면 결제 기록은 구글에 있는데 우리 쪽엔 없다.
        <button
          type="button"
          data-testid="restore-button"
          disabled={pending}
          onClick={() => run(restorePurchase)}
          className="inline-flex h-9 w-full items-center justify-center gap-1 text-sm font-semibold text-brand disabled:opacity-50"
        >
          <RotateCcw aria-hidden="true" size={14} />
          구매 복원
        </button>
      )}

      {msg ? (
        <p
          data-testid="subscription-message"
          className="px-1 text-xs text-zinc-600 dark:text-zinc-300"
        >
          {msg}
        </p>
      ) : null}

      <p className="px-1 text-xs text-zinc-400 dark:text-zinc-500">
        결제·해지·환불은 구글 플레이에서 관리해요.
      </p>
    </div>
  );
}

function PlanCard({
  id,
  active,
  canBuy,
  pending,
  onBuy,
  extra = null,
}: {
  id: PlanId;
  active: boolean;
  canBuy: boolean;
  pending: boolean;
  onBuy: () => void;
  /** 카드 아래 붙는 것(라이트 구독자에게 상담함). */
  extra?: ReactNode;
}) {
  const plan = PLANS[id];
  return (
    <article
      data-testid={`plan-${id}`}
      className={`app-card space-y-2 p-3 ${active ? "ring-2 ring-brand" : ""}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-100">
          {plan.label}
          {active ? (
            <span className="ml-1.5 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand">
              이용 중
            </span>
          ) : !plan.onSale ? (
            <span
              data-testid={`plan-${id}-soon`}
              className="ml-1.5 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-500 dark:bg-white/[0.08] dark:text-zinc-400"
            >
              오픈 준비 중
            </span>
          ) : null}
        </h3>
        <span className="shrink-0 text-sm font-semibold tabular-nums text-zinc-950 dark:text-zinc-100">
          월 {plan.priceKrw.toLocaleString("ko-KR")}원
        </span>
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{plan.tagline}</p>
      {plan.note ? (
        <p data-testid={`plan-${id}-note`} className="text-xs text-zinc-600 dark:text-zinc-300">
          {plan.note}
        </p>
      ) : null}
      <ul className="space-y-1">
        {PLAN_ORDER.indexOf(id) > 1 ? (
          <li className="text-xs text-zinc-500 dark:text-zinc-400">
            {PLANS[PLAN_ORDER[PLAN_ORDER.indexOf(id) - 1]].label} 혜택 전부 +
          </li>
        ) : null}
        {plan.benefits.map((b) => (
          <li key={b.text} className="flex items-start gap-1.5 text-sm text-zinc-800 dark:text-zinc-200">
            <Check aria-hidden="true" size={14} className="mt-1 shrink-0 text-brand" />
            <span className="min-w-0">
              {b.text}
              {!b.ready ? (
                <span className="ml-1.5 rounded-full bg-zinc-100 px-1.5 py-0.5 text-xs font-semibold text-zinc-500 dark:bg-white/[0.08] dark:text-zinc-400">
                  곧 제공
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
      {canBuy ? (
        <button
          type="button"
          data-testid={`subscribe-${id}`}
          disabled={pending}
          onClick={onBuy}
          className="app-press inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-brand text-sm font-semibold text-white dark:text-zinc-950 disabled:opacity-50"
        >
          {pending ? <Loader2 aria-hidden="true" size={16} className="animate-spin" /> : null}
          {plan.label} 시작하기
        </button>
      ) : null}
      {extra}
    </article>
  );
}
