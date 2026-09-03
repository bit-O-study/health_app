import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { BackLink } from "@/components/back-link";
import { getCurrentUser } from "@/lib/supabase/server";
import { getBillingStatusAction } from "@/features/billing/actions";
import { SubscriptionPanel } from "@/features/billing/components/subscription-panel";
import { AI_FEATURES, MONTHLY_LIMITS } from "@/features/coach/ai-quota";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "구독" };

/**
 * 구독 화면 — 로드맵 7.1.
 *
 * 무엇이 달라지는지를 **숫자로** 보여준다. "더 많이 쓸 수 있어요" 같은 말로는
 * 낼 만한지 판단할 수 없다. 한도 표(`MONTHLY_LIMITS`)를 그대로 읽으므로 표를 고치면
 * 화면도 같이 바뀐다 — 광고와 실제가 어긋나지 않는다.
 */
export default async function SubscriptionPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/settings/subscription");

  const status = await getBillingStatusAction();

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10 sm:px-8">
      <BackLink className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-200">
        <ChevronLeft aria-hidden="true" size={16} />
        뒤로
      </BackLink>

      <div className="mt-6 space-y-1">
        <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-100">
          구독
        </h1>
        <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          AI 기능을 더 넉넉하게 쓸 수 있어요. 나머지 기능은 구독과 상관없이 모두
          무료입니다.
        </p>
      </div>

      <section className="mt-8">
        <SubscriptionPanel initial={status} />
      </section>

      <section className="mt-8">
        <h2 className="mb-2 text-sm font-bold text-zinc-700 dark:text-zinc-300">
          한 달에 쓸 수 있는 횟수
        </h2>
        <ul className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
          <li className="flex items-center justify-between gap-2 bg-zinc-50 px-4 py-2 text-[11px] font-bold text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
            <span>기능</span>
            <span className="flex gap-6">
              <span className="w-10 text-right">무료</span>
              <span className="w-12 text-right">프리미엄</span>
            </span>
          </li>
          {AI_FEATURES.map((f) => (
            <li
              key={f.id}
              className="flex items-center justify-between gap-2 border-t border-zinc-100 bg-white px-4 py-2.5 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
            >
              <span className="min-w-0 truncate">{f.label}</span>
              <span className="flex shrink-0 gap-6 tabular-nums">
                <span className="w-10 text-right">{MONTHLY_LIMITS.free[f.id]}</span>
                <span className="w-12 text-right font-bold text-emerald-700 dark:text-emerald-400">
                  {MONTHLY_LIMITS.premium[f.id]}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
