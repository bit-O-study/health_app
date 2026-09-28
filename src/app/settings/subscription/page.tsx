import { AI_FEATURES } from "@/features/coach/ai-quota";
import { readAiUsage } from "@/features/coach/ai-usage";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/supabase/server";
import { getBillingStatusAction } from "@/features/billing/actions";
import { SubscriptionPanel } from "@/features/billing/components/subscription-panel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "구독" };

/**
 * 구독 화면 — 로드맵 7.1.
 *
 * 무엇이 달라지는지를 **숫자로** 보여준다. "더 많이 쓸 수 있어요" 같은 말로는
 * 낼 만한지 판단할 수 없다. 한도 표(`MONTHLY_LIMITS`)는 `SubscriptionPanel` 한 곳에서
 * 읽는다 — 예전엔 화면과 패널에 같은 표가 두 번 있었다(2026-09-16 8단계에서 하나로).
 */
export default async function SubscriptionPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/settings/subscription");

  const [status, usage] = await Promise.all([getBillingStatusAction(), Promise.all(AI_FEATURES.map(feature => readAiUsage(feature.id)))]);

  return (
    <div className="app-page">
      <PageHeader title="구독" back="설정" />
      <main className="app-container">
        <SubscriptionPanel initial={status} />
        <section className="app-card mt-4 p-4" aria-labelledby="ai-usage-title">
          <h2 id="ai-usage-title" className="text-base font-bold">이번 달 AI 사용량</h2>
          <ul className="mt-3 space-y-3">{usage.map((state, index) => <li key={state.feature} className="flex justify-between gap-3 text-sm"><span>{AI_FEATURES[index].label}</span><span className="tabular-nums">{state.used} / {state.limit}회</span></li>)}</ul>
        </section>
      </main>
    </div>
  );
}
