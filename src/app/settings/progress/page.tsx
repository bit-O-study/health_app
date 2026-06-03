import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, TrendingUp, Dumbbell } from "lucide-react";

import { getUserProfile } from "@/features/profile/data-access";
import { getRecentExerciseCompletions } from "@/features/routine/exercise-completions";
import { getCatalogExercise } from "@/features/routine/exercise-catalog";
import {
  dailyVolumeSeries,
  oneRMSeries,
  topExercisesByVolume,
  trendPct,
  type ProgressRecord,
} from "@/features/routine/progress";
import { LineChart } from "@/features/routine/components/line-chart";

export const dynamic = "force-dynamic";

function TrendBadge({ pct }: { pct: number | null }) {
  if (pct === null) {
    return (
      <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[11px] font-bold text-zinc-500">
        —
      </span>
    );
  }
  const up = pct >= 0;
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
        up
          ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400"
          : "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400"
      }`}
    >
      {up ? "▲" : "▼"} {Math.abs(pct)}%
    </span>
  );
}

export default async function ProgressPage() {
  const [profile, completions] = await Promise.all([
    getUserProfile(),
    getRecentExerciseCompletions(180),
  ]);
  if (!profile) redirect("/onboarding");

  const records: ProgressRecord[] = completions
    .filter((c) => c.status === "done")
    .map((c) => ({
      forDate: c.forDate,
      exerciseId: c.exerciseId,
      status: "done",
      sets: c.sets,
      reps: c.reps,
      weightKg: c.weightKg,
    }));

  const volume = dailyVolumeSeries(records);
  const totalVolume = volume.reduce((s, p) => s + p.value, 0);
  const top = topExercisesByVolume(records, 6);
  const exerciseCharts = top
    .map((t) => ({
      ...t,
      name: getCatalogExercise(t.exerciseId)?.name ?? t.exerciseId,
      series: oneRMSeries(records, t.exerciseId),
    }))
    .filter((e) => e.series.length > 0);

  const hasData = volume.length > 0;

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10 sm:px-8">
      <Link
        className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-200"
        href="/settings"
      >
        <ChevronLeft aria-hidden="true" size={16} />
        설정
      </Link>

      <div className="mt-6 mb-6 space-y-1">
        <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-100">
          성장 그래프
        </h1>
        <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          완료한 운동의 총 볼륨(무게×횟수×세트)과 종목별 추정 1RM 추이로 점진적
          과부하(성장)를 확인하세요.
        </p>
      </div>

      {!hasData ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 p-8 text-center">
          <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            아직 중량 운동 완료 기록이 없어요. 운동을 완료하면 여기에 성장 그래프가
            그려집니다.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-500"
          >
            오늘 운동하러 가기
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 총 볼륨 */}
          <section className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400">
                  <TrendingUp aria-hidden="true" size={18} />
                </span>
                <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-100">
                  총 볼륨 추이
                </h2>
              </div>
              <TrendBadge pct={trendPct(volume)} />
            </div>
            <LineChart points={volume} color="#4f46e5" unit="kg" />
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              누적 {Math.round(totalVolume).toLocaleString()}kg · {volume.length}일
              기록
            </p>
          </section>

          {/* 종목별 1RM */}
          <section className="space-y-4">
            <h2 className="flex items-center gap-2 text-base font-bold text-zinc-950 dark:text-zinc-100">
              <Dumbbell aria-hidden="true" size={18} className="text-zinc-500" />
              종목별 추정 1RM 추이
            </h2>
            {exerciseCharts.length === 0 ? (
              <p className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-600 p-5 text-center text-sm text-zinc-500">
                중량 기록이 더 쌓이면 종목별 1RM 추이가 표시됩니다.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {exerciseCharts.map((e) => {
                  const best = Math.max(...e.series.map((p) => p.value));
                  return (
                    <div
                      key={e.exerciseId}
                      className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4 shadow-sm"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-bold text-zinc-950 dark:text-zinc-100">
                          {e.name}
                        </p>
                        <TrendBadge pct={trendPct(e.series)} />
                      </div>
                      <LineChart points={e.series} color="#0891b2" unit="kg" height={120} />
                      <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                        최고 추정 1RM <strong>{best}kg</strong>
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
