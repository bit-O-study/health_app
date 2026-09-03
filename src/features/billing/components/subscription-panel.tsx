"use client";

import { useState, useTransition } from "react";
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
import { PREMIUM_PRODUCT_ID } from "@/features/billing/products";

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

  return (
    <div className="space-y-3">
      <section
        data-testid="subscription-status"
        data-premium={status.premium ? "1" : "0"}
        className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-800"
      >
        <p className="flex items-center gap-2 text-sm font-bold text-zinc-950 dark:text-zinc-100">
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-lg ${
              status.premium
                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                : "bg-zinc-100 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-300"
            }`}
          >
            <Crown aria-hidden="true" size={15} />
          </span>
          {status.premium ? "프리미엄" : "무료"}
        </p>
        <p className="mt-1.5 text-xs leading-5 text-zinc-600 dark:text-zinc-400">
          {status.label}
        </p>
      </section>

      {!status.ready ? (
        // 설정이 안 된 걸 오류처럼 보여주면 사용자가 자기 잘못인 줄 안다.
        <p
          data-testid="subscription-not-ready"
          className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
        >
          구독은 아직 준비 중이에요. 지금은 모든 기능을 무료 한도 안에서 쓸 수 있어요.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            data-testid="subscribe-button"
            disabled={pending || status.premium}
            onClick={() => run(() => purchaseSubscription(PREMIUM_PRODUCT_ID))}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
          >
            {pending ? (
              <Loader2 aria-hidden="true" size={15} className="animate-spin" />
            ) : (
              <Crown aria-hidden="true" size={15} />
            )}
            {status.premium ? "이미 구독 중이에요" : "프리미엄 구독하기"}
          </button>
          {/* 기기를 바꾸거나 다시 깔면 결제 기록은 구글에 있는데 우리 쪽엔 없다. */}
          <button
            type="button"
            data-testid="restore-button"
            disabled={pending}
            onClick={() => run(restorePurchase)}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-zinc-300 text-xs font-bold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <RotateCcw aria-hidden="true" size={13} />
            구매 복원
          </button>
        </div>
      )}

      {msg ? (
        <p
          data-testid="subscription-message"
          className="text-xs leading-5 text-zinc-600 dark:text-zinc-300"
        >
          {msg}
        </p>
      ) : null}

      <p className="px-1 text-[11px] leading-5 text-zinc-400 dark:text-zinc-500">
        결제·해지·환불은 <strong>구글 플레이</strong>에서 관리해요. 해지해도 이미 결제한
        기간이 끝날 때까지는 그대로 쓸 수 있어요.
      </p>
    </div>
  );
}
