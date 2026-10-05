import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/supabase/server";
import { isAiFeatureEnabled } from "@/features/coach/ai-access.server";
import { hasAiConsent } from "@/features/coach/ai-consent";
import { readAiUsage } from "@/features/coach/ai-usage";
import { loadMyState } from "@/features/coach/my-state-data";
import { myStateLines } from "@/features/coach/my-state";
import { loadDietContext } from "@/features/coach/diet-coach-data";
import { suggestTrainerCommitmentsAction } from "@/features/coach/ai-trainer-actions";
import { EXERCISES } from "@/features/routine/exercise-catalog";
import { getPainAreas, getTodayCheckin } from "@/features/routine/checkin-data";
import { trainerStateLines } from "@/features/routine/checkin";
import { seoulYmd } from "@/features/routine/data";
import { getUserProfile } from "@/features/profile/data-access";
import { AiTrainerPanel } from "@/features/coach/components/ai-trainer-panel";
import { DietCoachSection } from "@/features/coach/components/diet-coach-section";
import { CommitmentSuggestions } from "@/features/coach/components/commitment-suggestions";

export const dynamic = "force-dynamic";
export const metadata = { title: "AI 트레이너" };

/**
 * AI 트레이너 탭(2026-09-30 2단계) — 오늘의 운동(시간 맞춤) · 오늘 식단 · 다짐 추천.
 *
 * 🔴 사용자 결정 — AI 가 운동을 직접 바꾸지 않는다. 여기서 오늘의 운동을 보여 주고, [바꾸기]/[더하기]를
 *    눌러야 '오늘만 운동 변경'으로 넘어간다. 내 상태·식단 목표는 AI 없이 계산한 숫자라 늘 보여 준다.
 */
export default async function AiTrainerPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/ai-trainer");
  // 아직 공개 전 — 자기 스위치(기본: 디버그 계정만). 관리자 화면에서 공개 범위를 바꾼다.
  if (!(await isAiFeatureEnabled("ai-trainer"))) notFound();

  const [state, consent, quota, diet, dietQuota, checkin, painAreas, profile] = await Promise.all([
    loadMyState(),
    hasAiConsent(),
    readAiUsage("trainer"),
    loadDietContext(),
    readAiUsage("diet-coach"),
    getTodayCheckin(),
    getPainAreas(),
    getUserProfile(),
  ]);
  // AI 에 보내는 줄과 같은 줄(오늘 컨디션·아픈 부위 포함)을 보여 준다.
  const lines = trainerStateLines(
    state ? myStateLines(state, (id) => EXERCISES[id]?.name ?? id) : [],
    checkin,
    painAreas,
  );
  const today = seoulYmd();

  return (
    <div className="app-page">
      <PageHeader branded title="AI 트레이너" back />
      <main className="app-container space-y-3">
        <AiTrainerPanel
          userId={user.id}
          today={today}
          stateLines={lines}
          consent={consent}
          remaining={quota.remaining}
          limit={quota.limit}
          tier={quota.tier}
          initialMinutes={profile?.sessionMinutes ?? null}
        />
        {diet ? (
          <DietCoachSection
            userId={user.id}
            today={today}
            targets={diet.targets}
            intake={diet.today}
            consent={consent}
            remaining={dietQuota.remaining}
            limit={dietQuota.limit}
          />
        ) : null}
        {consent ? (
          <CommitmentSuggestions
            suggest={suggestTrainerCommitmentsAction}
            description="내 상태 숫자로 실천할 다짐을 제안받고, 바로 추가하세요."
          />
        ) : null}
      </main>
    </div>
  );
}
