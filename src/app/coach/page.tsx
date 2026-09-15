import { redirect, notFound } from "next/navigation";
import { ArrowLeft, Camera, Dumbbell, GraduationCap, Salad } from "lucide-react";

import { BackLink } from "@/components/back-link";
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

export default async function CoachPage() {
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

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-6 sm:px-5">
      <BackLink className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-200">
        <ArrowLeft aria-hidden="true" size={15} />
        뒤로
      </BackLink>

      {/* 히어로 */}
      {/* 초록 그라데이션 박스 대신 다른 화면과 같은 카드(2026-09-15 화면 간결화). */}
      <div className="app-card mb-5 p-5">
        <div className="flex items-center gap-2">
          <GraduationCap aria-hidden="true" size={24} className="text-brand" />
          <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-50">헬쑤쌤</h1>
        </div>
        <p className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
          AI 코치가 내 운동·식단을 분석해 뭘 해야 할지, 어디가 부족한지, 자세는
          어떻게 고칠지 알려드려요.
        </p>
      </div>

      <div className="space-y-4">
        <AnalysisSection
          icon={<Dumbbell aria-hidden="true" size={20} />}
          title="운동 분석"
          description="최근 운동 기록으로 부족한 부위와 다음에 할 운동을 코치."
          cta="내 운동 분석하기"
          run={analyzeWorkoutAction}
          saved={lastWorkout}
        />

        <AnalysisSection
          icon={<Salad aria-hidden="true" size={20} />}
          title="식단 코칭"
          description="최근 식단으로 칼로리·영양 균형과 개선점을 코치."
          cta="내 식단 분석하기"
          run={analyzeDietAction}
          saved={lastDiet}
        />

        <CommitmentSuggestions />

        <PostureAnalyzer />

        {/* 기구 검색 */}
        <section className="app-card p-4">
          <div className="mb-3 flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <Camera aria-hidden="true" size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                기구 검색
              </h2>
              <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                헬스장 기구를 찍으면 어떤 기구인지, 어떤 운동을 할 수 있는지 알려줘요.
              </p>
            </div>
          </div>
          <EquipmentScanner />
        </section>
      </div>

      <p className="mt-6 text-center text-xs text-zinc-400">
        AI 분석은 참고용이에요. 통증이 있으면 전문가와 상담하세요.
      </p>
    </main>
  );
}
