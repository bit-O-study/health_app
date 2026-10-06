import Link from "next/link";
import { getCoachReview } from "@/features/coach/workout-review-data";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { resolvePlan } from "@/features/billing/plan-store";
import { hasPlan } from "@/features/billing/plans";
import { ManualCoachPanel } from "@/features/coach/components/manual-coach-panel";
import type { CoachRequest } from "@/features/coach/manual-model";

export const dynamic = "force-dynamic";
export const metadata = { title: "상담함" };
export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/coach/manual");
  // 2026-10-05 병합: 상담함은 라이트(990원) 이상 혜택 — 트레이너·팀 연결 회원(플러스)도 포함.
  const active = hasPlan(await resolvePlan(), "lite");
  const reviewResult = active ? await getCoachReview() : { review: null, error: null };
  const db = await createSupabaseServerClient();
  const { data, error } = await db.from("manual_coach_requests").select("id,kind,for_date,question,answer,answered_at,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(60);
  return <div className="app-page"><PageHeader title="상담함" back /><main className="app-container space-y-4">
    {!active && <Link href="/settings/subscription" className="app-card flex items-center justify-between p-4 text-sm"><span className="text-zinc-700 dark:text-zinc-200">상담함은 라이트(월 990원)에서 쓸 수 있어요</span><span className="font-semibold text-brand">알아보기</span></Link>}
    {error ? <p role="alert" className="app-card p-4">코칭 내역을 불러오지 못했어요. 잠시 뒤 다시 확인해 주세요.</p> : <ManualCoachPanel rows={(data ?? []) as CoachRequest[]} active={active} review={reviewResult.review} reviewError={reviewResult.error} />}
  </main></div>;
}
