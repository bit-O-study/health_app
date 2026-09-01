import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarRange,
  ChevronLeft,
  Dumbbell,
  TrendingUp,
  Trophy,
} from "lucide-react";

import { BackLink } from "@/components/back-link";
import { getUserProfile } from "@/features/profile/data-access";
import { getRecentExerciseCompletions } from "@/features/routine/exercise-completions";
import { getCatalogExercise } from "@/features/routine/exercise-catalog";
import {
  dailyVolumeSeries,
  exerciseHistory,
  oneRMSeries,
  recentPersonalRecords,
  topExercisesByVolume,
  trendPct,
  weeklyVolumeSeries,
  type ProgressRecord,
} from "@/features/routine/progress";
import {
  needsAttention,
  overloadPlan,
  type OverloadPlan,
} from "@/features/routine/overload";
import { seoulYmd } from "@/features/routine/data";
import { isUnilateralExercise } from "@/features/routine/unilateral-exercises";
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

/** 종류별 말머리 — 무엇을 하라는 건지 한 눈에. */
const ACTION_LABEL: Record<OverloadPlan["action"], string> = {
  increase: "증량",
  "add-reps": "횟수 채우기",
  deload: "디로드",
  rest: "휴식 권장",
  first: "한 번 더",
  bodyweight: "횟수·시간",
  none: "",
};

/**
 * 다음 세션 추천 — **근거를 같이** 보여준다.
 * 숫자만 던지면 왜 그런지 몰라 따르거나 무시할 판단을 못 한다.
 */
function OverloadLine({ plan }: { plan: OverloadPlan }) {
  if (plan.action === "none") return null;
  const attention = needsAttention(plan);
  return (
    <div
      className={`mt-2 rounded-lg px-2.5 py-2 text-xs ${
        attention
          ? "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
          : plan.action === "increase"
            ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
            : "bg-zinc-50 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
      }`}
    >
      <p className="font-semibold">
        {ACTION_LABEL[plan.action]}
        {plan.suggestedKg !== null ? ` · ${plan.suggestedKg}kg` : ""}
        {plan.suggestedReps !== null ? ` × ${plan.suggestedReps}회` : ""}
      </p>
      <p className="mt-0.5 leading-5 opacity-80">{plan.reason}</p>
    </div>
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
      // 드롭세트·피라미드는 여기에 있다 — 안 넘기면 균일 세트로만 계산돼 값이 틀어진다.
      setDetails: c.setDetails,
    }));

  const volume = dailyVolumeSeries(records);
  const weekly = weeklyVolumeSeries(records);
  const totalVolume = volume.reduce((s, p) => s + p.value, 0);
  const top = topExercisesByVolume(records, 6);
  const exerciseCharts = top
    .map((t) => ({
      ...t,
      name: getCatalogExercise(t.exerciseId)?.name ?? t.exerciseId,
      series: oneRMSeries(records, t.exerciseId),
      history: exerciseHistory(records, t.exerciseId).slice(0, 5),
      plan: overloadPlan(records, t.exerciseId, profile.experience),
      unilateral: isUnilateralExercise(t.exerciseId),
    }))
    .filter((e) => e.series.length > 0);

  const newPrs = recentPersonalRecords(records, seoulYmd(), 30).map((pr) => ({
    ...pr,
    name: getCatalogExercise(pr.exerciseId)?.name ?? pr.exerciseId,
  }));

  const hasData = volume.length > 0;

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10 sm:px-8">
      <BackLink className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-200">
        <ChevronLeft aria-hidden="true" size={16} />
        설정
      </BackLink>

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
            href="/routine"
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

          {/* 주간 볼륨 — 일별은 운동한 날/쉰 날이 번갈아 톱니처럼 보여 추세가 안 보인다. */}
          {weekly.length >= 2 ? (
            <section className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-400">
                    <CalendarRange aria-hidden="true" size={18} />
                  </span>
                  <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-100">
                    주간 총 볼륨
                  </h2>
                </div>
                <TrendBadge pct={trendPct(weekly)} />
              </div>
              <LineChart points={weekly} color="#7c3aed" unit="kg" />
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                주(월요일) 단위 합계 · 최근 {weekly.length}주
              </p>
            </section>
          ) : null}

          {/* 개인 기록 — "언제 이 무게에 올라섰나"가 성장의 가장 또렷한 증거다. */}
          {newPrs.length > 0 ? (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm dark:border-amber-800/60 dark:bg-amber-950/30">
              <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-zinc-950 dark:text-zinc-100">
                <Trophy aria-hidden="true" size={18} className="text-amber-600" />
                최근 30일 새 기록
              </h2>
              <ul className="space-y-1.5">
                {newPrs.map((pr) => (
                  <li
                    key={`${pr.exerciseId}-${pr.kind}`}
                    className="flex items-baseline justify-between gap-2 text-sm"
                  >
                    <span className="min-w-0 truncate font-semibold text-zinc-900 dark:text-zinc-100">
                      {pr.name}
                    </span>
                    <span className="shrink-0 text-zinc-700 dark:text-zinc-300">
                      {pr.kind === "oneRm" ? "추정 1RM" : "최고 중량"}{" "}
                      <strong>{pr.value}kg</strong>
                      <span className="ml-1.5 text-xs text-zinc-500">
                        {pr.date.slice(5).replace("-", "/")}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* 종목별 1RM */}
          <section className="space-y-4">
            <h2 className="flex items-center gap-2 text-base font-bold text-zinc-950 dark:text-zinc-100">
              <Dumbbell aria-hidden="true" size={18} className="text-zinc-500" />
              종목별 추정 1RM 추이
            </h2>
            <p className="-mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              아래 추천은 완료 기록만 보고 만든 <strong>제안</strong>이에요. 몸 상태에
              따라 그대로 따르지 않아도 됩니다.
            </p>
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
                        {e.unilateral ? (
                          <span className="ml-1.5 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                            한쪽 기준
                          </span>
                        ) : null}
                      </p>
                      <OverloadLine plan={e.plan} />
                      {e.history.length > 0 ? (
                        <ul className="mt-2 space-y-0.5 border-t border-zinc-100 pt-2 text-[11px] text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                          {e.history.map((h) => (
                            <li key={h.date} className="flex justify-between gap-2">
                              <span>{h.date.slice(5).replace("-", "/")}</span>
                              <span className="text-zinc-600 dark:text-zinc-300">
                                {h.weightKg !== null && h.weightKg > 0
                                  ? `${h.weightKg}kg × ${h.reps} × ${h.sets}세트`
                                  : `맨몸 ${h.reps}회 × ${h.sets}세트`}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
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
