"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Crown, Loader2, RotateCcw } from "lucide-react";

import {
  verifyPurchaseAction,
  type BillingStatus,
} from "@/features/billing/actions";
import {
  purchaseSubscription,
  restorePurchase,
} from "@/features/billing/play-billing-native";
import {
  PREMIUM_PRICE_KRW,
  COACH_PRODUCT_ID,
  COACH_PRICE_KRW,
} from "@/features/billing/products";
import { AI_FEATURES, MONTHLY_LIMITS } from "@/features/coach/ai-quota";

/**
 * 구독 화면 — 로드맵 7.1.
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

  // 촘촘한 목록(2026-09-16 8단계) — 상태 한 줄 · 한도 표 한 장 · 버튼. 한도 표는 이 한 곳에만 둔다(화면에 중복 없음).
  return (
    <div className="space-y-4">
      <section
        data-testid="subscription-status"
        data-premium={status.premium ? "1" : "0"}
        className="app-card flex items-center gap-3 p-3"
      >
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
            status.premium
              ? "bg-brand-soft text-brand"
              : "bg-zinc-100 text-zinc-500 dark:bg-white/[0.08] dark:text-zinc-300"
          }`}
        >
          <Crown aria-hidden="true" size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold text-zinc-950 dark:text-zinc-100">
            {status.premium ? "프리미엄" : status.coaching ? "짐꾼 코칭" : "무료"}
          </span>
          <span className="block text-xs text-zinc-500 dark:text-zinc-400">{status.label}</span>
        </span>
      </section>

      {/*
        🔴 무엇을 사는지 **여기서** 보여 준다. 예전엔 "프리미엄 구독하기" 버튼만 있어서
        무료와 뭐가 다른지 알 수 없었다 — 값을 모르는 걸 누가 결제하지 않는다.
        한도는 `ai-quota.ts` 한 곳에서 읽는다(화면에 숫자를 다시 적으면 조용히 갈린다).
      */}
      <section data-testid="coaching-benefits" className="app-card space-y-3 p-4">
        <div className="flex justify-between gap-2"><h2 className="font-semibold">짐꾼 코칭</h2><strong>월 {COACH_PRICE_KRW.toLocaleString("ko-KR")}원</strong></div>
        <ul className="space-y-1 text-sm"><li>오늘 운동 추천</li><li>주간 운동 습관 리포트</li><li>운영자가 답변하는 헬스 상담</li></ul>
        <p className="text-xs text-zinc-500">요청을 남기면 운영자가 확인 후 전달해요. 즉시 응답하는 실시간 AI 상담은 아니에요. AI 사진 분석 추가 한도는 포함되지 않아요.</p>
        <Link href="/coach/manual" className="block text-sm font-semibold text-brand">추천·리포트·상담함 열기</Link>
        {!status.coachingReady && !status.coaching && <p className="text-sm text-zinc-500">결제 연결 준비 중</p>}
        <button type="button" data-testid="coach-subscribe-button" disabled={pending || status.coaching || !status.coachingReady} onClick={() => run(() => purchaseSubscription(COACH_PRODUCT_ID))} className="w-full rounded-full bg-brand px-4 py-3 font-semibold text-white dark:text-zinc-950 disabled:opacity-50">
          {status.coaching ? "이용 중인 요금제" : pending ? "확인 중…" : "월 990원 코칭 구독하기"}
        </button>
      </section>

      <section data-testid="premium-benefits">
        <div className="flex items-baseline justify-between">
          <h2 className="app-section-label">개인 프리미엄 · 오픈 준비 중</h2>
          <span className="mb-1.5 px-1 text-xs text-zinc-500 dark:text-zinc-400">
            월 {PREMIUM_PRICE_KRW.toLocaleString("ko-KR")}원
          </span>
        </div>
        <ul className="app-list">
          <li className="flex items-center justify-between gap-2 px-3 py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            <span>기능</span>
            <span className="flex gap-6">
              <span className="w-10 text-right">무료</span>
              <span className="w-12 text-right text-brand">프리미엄</span>
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

      {!status.ready ? (
        // 설정이 안 된 걸 오류처럼 보여주면 사용자가 자기 잘못인 줄 안다.
        <p
          data-testid="subscription-not-ready"
          className="app-card p-3 text-sm text-zinc-600 dark:text-zinc-300"
        >
          구독은 아직 준비 중이에요.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            data-testid="subscribe-button"
            disabled
            className="app-press inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-brand text-base font-semibold text-white dark:text-zinc-950 disabled:opacity-50"
          >
            {pending ? (
              <Loader2 aria-hidden="true" size={16} className="animate-spin" />
            ) : (
              <Crown aria-hidden="true" size={16} />
            )}
            오픈 준비 중
          </button>
          {/* 기기를 바꾸거나 다시 깔면 결제 기록은 구글에 있는데 우리 쪽엔 없다. */}
          <button
            type="button"
            data-testid="restore-button"
            disabled={pending}
            onClick={() => run(restorePurchase)}
            className="inline-flex h-9 items-center justify-center gap-1 text-sm font-semibold text-brand disabled:opacity-50"
          >
            <RotateCcw aria-hidden="true" size={14} />
            구매 복원
          </button>
        </div>
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
