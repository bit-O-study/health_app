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

  const status = await getBillingStatusAction();

  return (
    <div className="app-page">
      <PageHeader title="구독" back="설정" />
      <main className="app-container">
        <SubscriptionPanel initial={status} />
      </main>
    </div>
  );
}
