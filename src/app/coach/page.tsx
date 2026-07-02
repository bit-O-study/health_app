import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, Camera, Dumbbell, GraduationCap, Salad } from "lucide-react";

import { getCurrentUser } from "@/lib/supabase/server";
import { isDebugFeatureEnabled } from "@/features/admin/debug-features.server";
import {
  analyzeWorkoutAction,
  analyzeDietAction,
} from "@/features/coach/coach-actions";
import { AnalysisSection } from "@/features/coach/components/analysis-section";
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

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-6 sm:px-5">
      <Link
        href="/routine"
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-200"
      >
        <ArrowLeft aria-hidden="true" size={15} />
        홈으로
      </Link>

      {/* 히어로 */}
      <div className="mb-5 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 p-5 text-white shadow-sm">
        <div className="flex items-center gap-2">
          <GraduationCap aria-hidden="true" size={26} />
          <h1 className="text-2xl font-extrabold">헬쑤쌤</h1>
        </div>
        <p className="mt-1 text-sm leading-6 text-emerald-50">
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
        />

        <AnalysisSection
          icon={<Salad aria-hidden="true" size={20} />}
          title="식단 코칭"
          description="최근 식단으로 칼로리·영양 균형과 개선점을 코치."
          cta="내 식단 분석하기"
          run={analyzeDietAction}
        />

        <CommitmentSuggestions />

        <PostureAnalyzer />

        {/* 기구 검색 */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-3 flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
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

      <p className="mt-6 text-center text-[11px] text-zinc-400">
        AI 분석은 참고용이에요. 통증이 있으면 전문가와 상담하세요.
      </p>
    </main>
  );
}
