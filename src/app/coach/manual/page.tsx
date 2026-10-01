import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { getMySubscription } from "@/features/billing/subscription-store";
import { isCoachEntitled } from "@/features/billing/subscription";
import { ManualCoachPanel } from "@/features/coach/components/manual-coach-panel";
import type { CoachRequest } from "@/features/coach/manual-model";

export const dynamic = "force-dynamic";
export const metadata = { title: "짐꾼 코칭" };
export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/coach/manual");
  const active = isCoachEntitled(await getMySubscription());
  const db = await createSupabaseServerClient();
  const { data, error } = await db.from("manual_coach_requests").select("id,kind,for_date,question,answer,answered_at,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(60);
  return <div className="app-page"><PageHeader branded title="짐꾼 코칭" back /><main className="app-container space-y-4">
    {!active && <Link href="/settings/subscription" className="app-card block p-4 text-sm text-brand">월 990원 코칭 요금제 알아보기</Link>}
    {error ? <p role="alert" className="app-card p-4">코칭 내역을 불러오지 못했어요. 잠시 뒤 다시 확인해 주세요.</p> : <ManualCoachPanel rows={(data ?? []) as CoachRequest[]} active={active} />}
  </main></div>;
}
