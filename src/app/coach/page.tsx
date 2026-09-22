import { redirect, notFound } from "next/navigation";
import { Camera, Dumbbell, Salad } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/supabase/server";
import { isDebugFeatureEnabled } from "@/features/admin/debug-features.server";
import {
  analyzeWorkoutAction,
  analyzeDietAction,
} from "@/features/coach/coach-actions";
import { AnalysisSection } from "@/features/coach/components/analysis-section";
import { getLatestAnalysis } from "@/features/coach/analysis-store";
import { CommitmentSuggestions } from "@/features/coach/components/commitment-suggestions";
import { PostureAnalyzer } from "@/features/coach/components/posture-analyzer";
import { EquipmentScanner } from "@/features/equipment/components/equipment-scanner";

export const dynamic = "force-dynamic";
export const metadata = { title: "헬쑤쌤" };

export default async function CoachPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/coach");
  // 아직 디버그 기능 — 헬쑤쌤이 켜진 계정만.
  if (!(await isDebugFeatureEnabled("helssu-coach"))) notFound();

  // 지난 분석을 먼저 띄운다 — 화면을 다시 여는 것만으로 AI 를 부르면 읽으려고 돈을 낸다.
  // 둘은 서로 독립이라 한 번에 읽는다(직렬 2파 → 1파).
  const [lastWorkout, lastDiet] = await Promise.all([
    getLatestAnalysis("workout"),
    getLatestAnalysis("diet"),
  ]);

  // 공통 머리글(2026-09-16 8단계) — 소개 카드는 뺐다(각 분석 카드 제목이 곧 설명).
  return (
    <div className="app-page">
    <PageHeader title="헬쑤쌤" back />
    <main className="app-container">
      <div className="space-y-3">
        {view !== "recommend" && <>
        <AnalysisSection
          icon={<Dumbbell aria-hidden="true" size={18} />}
          title="운동 분석"
          description="최근 운동 기록으로 부족한 부위와 다음에 할 운동을 코치."
          cta="내 운동 분석하기"
          run={analyzeWorkoutAction}
          saved={lastWorkout}
        />

        <AnalysisSection
          icon={<Salad aria-hidden="true" size={18} />}
          title="식단 코칭"
          description="최근 식단으로 칼로리·영양 균형과 개선점을 코치."
          cta="내 식단 분석하기"
          run={analyzeDietAction}
          saved={lastDiet}
        />

        </>}
        {view !== "analysis" && <section aria-label="추천 다짐"><CommitmentSuggestions /></section>}

        <PostureAnalyzer />

        {/* 기구 검색 */}
        <section className="app-card p-3">
          <div className="mb-2.5 flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
              <Camera aria-hidden="true" size={18} />
            </span>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              기구 검색
            </h2>
          </div>
          <EquipmentScanner />
        </section>
      </div>

      <p className="mt-4 text-center text-xs text-zinc-400">
        AI 분석은 참고용이에요. 통증이 있으면 전문가와 상담하세요.
      </p>
    </main>
    </div>
  );
}
