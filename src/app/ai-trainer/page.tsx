import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/supabase/server";
import { isDebugFeatureEnabled } from "@/features/admin/debug-features.server";
import { hasAiConsent } from "@/features/coach/ai-consent";
import { readAiUsage } from "@/features/coach/ai-usage";
import { loadMyState } from "@/features/coach/my-state-data";
import { myStateLines } from "@/features/coach/my-state";
import { EXERCISES } from "@/features/routine/exercise-catalog";
import { seoulYmd } from "@/features/routine/data";
import { AiTrainerPanel } from "@/features/coach/components/ai-trainer-panel";

export const dynamic = "force-dynamic";
export const metadata = { title: "AI 트레이너" };

/**
 * AI 트레이너 탭(2026-09-30 2단계).
 *
 * 🔴 사용자 결정 — AI 가 운동을 직접 바꾸지 않는다. 여기서 오늘의 운동을 보여 주고, [적용]을
 *    눌러야 '오늘만 운동 변경'으로 넘어간다. 내 상태 카드는 AI 없이 계산한 숫자라 공짜로 보여 준다.
 */
export default async function AiTrainerPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/ai-trainer");
  // 아직 공개 전 — 자기 스위치(기본: 디버그 계정만). 관리자 화면에서 공개 범위를 바꾼다.
  if (!(await isDebugFeatureEnabled("ai-trainer"))) notFound();

  const [state, consent, quota] = await Promise.all([
    loadMyState(),
    hasAiConsent(),
    readAiUsage("trainer"),
  ]);
  const lines = state ? myStateLines(state, (id) => EXERCISES[id]?.name ?? id) : [];

  return (
    <div className="app-page">
      <PageHeader branded title="AI 트레이너" back />
      <main className="app-container">
        <AiTrainerPanel
          userId={user.id}
          today={seoulYmd()}
          stateLines={lines}
          consent={consent}
          remaining={quota.remaining}
          limit={quota.limit}
          tier={quota.tier}
        />
      </main>
    </div>
  );
}
