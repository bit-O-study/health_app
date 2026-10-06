import { notFound, redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/supabase/server";
import { getFitAccess } from "@/features/routine/fit-access";
import { loadFitGrowth, loadFitHeaderInfo } from "@/features/routine/fit-data";
import { loadGoals } from "@/features/lite/goals-data";
import { GoalsCard } from "@/features/lite/components/goals-card";
import { FitHeader, FitHeadline, FitLocked, styleTextOf } from "@/features/routine/components/fit-shell";
import { growthEnds, iGa } from "@/features/routine/fit-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "성장" };

/**
 * 맞춤 운동 · 성장(2026-10-06 UI 개편) — 결론 한 줄 → 내 목표 → 종목 추이(양끝 날짜·무게) → 신기록.
 */
export default async function FitGrowthPage() {
  if (!(await getCurrentUser())) redirect("/login?redirect=/fit/growth");
  const access = await getFitAccess();
  if (!access.visible) notFound();
  const [info, growth, goals] = await Promise.all([loadFitHeaderInfo(), loadFitGrowth(), loadGoals()]);
  if (!growth) redirect("/login?redirect=/fit/growth");
  const full = access.full;
  const rising = growth.growth.filter((g) => (g.trend ?? 0) > 0).length;
  const stalled = growth.growth.filter((g) => g.stalled);

  return (
    <div className="app-page" data-testid="fit-page" data-full={full ? "1" : "0"}>
      <FitHeader title="성장" full={full} styleText={styleTextOf(info.style)} experienceLabel={info.experienceLabel} />
      <main className="app-container space-y-3">
        <FitHeadline testId="fit-headline" sub="지난달 1일부터 기록한 무게 기준이에요.">
          {growth.growth.length === 0
            ? "무게를 기록하면 성장을 보여 드려요"
            : stalled.length > 0
              ? `${stalled[0].name}${iGa(stalled[0].name)} 3번 연속 그대로예요`
              : `${rising}개 종목이 오르고 있어요`}
        </FitHeadline>

        {goals ? <GoalsCard view={goals} /> : null}

        {full
          ? growth.growth.map((g) => {
              const ends = growthEnds(g.series);
              return (
                <section key={g.exerciseId} className="app-card space-y-1.5 p-4" data-testid={`fit-growth-${g.exerciseId}`}>
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{g.name}</h2>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        g.stalled ? "bg-warn/10 text-warn" : "bg-brand-soft text-brand"
                      }`}
                    >
                      {g.stalled ? "3번 연속 그대로" : `예상 1RM ${g.latestKg}kg`}
                    </span>
                  </div>
                  <svg viewBox="0 0 200 36" className="h-9 w-full" role="img" aria-label={`${g.name} 예상 1RM 추이`}>
                    <polyline points={g.points} fill="none" className="stroke-brand" strokeWidth="2" />
                  </svg>
                  {ends ? (
                    <p className="flex justify-between text-xs tabular-nums text-zinc-500 dark:text-zinc-400" data-testid="fit-growth-ends">
                      <span>{ends.from}</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-100">
                        {ends.to} ({ends.diffKg > 0 ? "+" : ""}
                        {ends.diffKg}kg)
                      </span>
                    </p>
                  ) : (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">기록이 더 쌓이면 추이를 보여 드려요.</p>
                  )}
                  {g.stalled ? (
                    <p className="text-xs text-zinc-600 dark:text-zinc-300">무게를 한 단계 올리거나 세트 방식을 바꿔 볼 때예요.</p>
                  ) : null}
                </section>
              );
            })
          : null}

        <section className="app-card space-y-1.5 p-4" data-testid="fit-prs">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">신기록</h2>
          {growth.prs.length ? (
            growth.prs.map((p) => (
              <div key={`${p.date}-${p.exerciseId}`} className="flex justify-between text-xs text-zinc-700 dark:text-zinc-200">
                <span>
                  {Number(p.date.slice(5, 7))}/{Number(p.date.slice(8, 10))} {p.name}
                </span>
                <span className="tabular-nums">
                  {p.oneRmKg}kg (+{p.gainKg})
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">지난 최고보다 무겁게 하면 여기에 쌓여요.</p>
          )}
        </section>
        {!full ? <FitLocked what="종목별 성장 추이" /> : null}
      </main>
    </div>
  );
}
