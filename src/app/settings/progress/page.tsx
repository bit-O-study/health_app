import Link from "next/link";
import { redirect } from "next/navigation";
import { Trophy } from "lucide-react";

import { PageHeader } from "@/components/page-header";
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
import { overloadPlan } from "@/features/routine/overload";
import { toAdvice } from "@/features/routine/overload-advice";
import { OverloadHint } from "@/features/routine/components/overload-hint";
import { seoulYmd } from "@/features/routine/data";
import { isUnilateralExercise } from "@/features/routine/unilateral-exercises";
import { LineChart } from "@/features/routine/components/line-chart";

export const dynamic = "force-dynamic";

function TrendBadge({ pct }: { pct: number | null }) {
  if (pct === null) {
    return (
      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-500 dark:bg-white/[0.08]">
        —
      </span>
    );
  }
  const up = pct >= 0;
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
        up ? "bg-brand-soft text-brand" : "bg-danger/10 text-danger"
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
      // 증량 단위(바벨 5kg / 덤벨 1kg)가 기구로 갈린다 — 안 넘기면 기본 2kg 로 떨어져
      // 운동모드와 다른 증량을 권하게 된다.
      equipment: c.equipment,
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
      // 성장 그래프·운동모드·계획 편집이 같은 모양으로 보게 — 화면값 변환은 한 곳에서.
      advice: toAdvice(overloadPlan(records, t.exerciseId, profile.experience)),
      unilateral: isUnilateralExercise(t.exerciseId),
    }))
    .filter((e) => e.series.length > 0);

  const newPrs = recentPersonalRecords(records, seoulYmd(), 30).map((pr) => ({
    ...pr,
    name: getCatalogExercise(pr.exerciseId)?.name ?? pr.exerciseId,
  }));

  const hasData = volume.length > 0;

  // 공통 머리글 + 섹션 라벨 + 카드(2026-09-16 8단계) — 설명 문장은 빼고, 그래프 색은 브랜드 하나.
  return (
    <div className="app-page">
      <PageHeader title="성장 그래프" back="설정" />
      <main className="app-container space-y-4">
        {!hasData ? (
          <div className="app-card p-6 text-center">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              아직 중량 운동 완료 기록이 없어요
            </p>
            <Link
              href="/routine"
              className="app-press mt-3 inline-flex h-9 items-center justify-center rounded-full bg-brand px-4 text-sm font-semibold text-white dark:text-zinc-950"
            >
              오늘 운동하러 가기
            </Link>
          </div>
        ) : (
          <>
            {/* 총 볼륨 */}
            <section>
              <div className="flex items-center justify-between gap-2">
                <h2 className="app-section-label">총 볼륨 추이</h2>
                <span className="mb-1.5">
                  <TrendBadge pct={trendPct(volume)} />
                </span>
              </div>
              <div className="app-card p-3">
                <LineChart points={volume} color="var(--brand)" unit="kg" />
                <p className="mt-1.5 text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                  누적 {Math.round(totalVolume).toLocaleString()}kg · {volume.length}일 기록
                </p>
              </div>
            </section>

            {/* 주간 볼륨 — 일별은 운동한 날/쉰 날이 번갈아 톱니처럼 보여 추세가 안 보인다. */}
            {weekly.length >= 2 ? (
              <section>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="app-section-label">주간 총 볼륨</h2>
                  <span className="mb-1.5">
                    <TrendBadge pct={trendPct(weekly)} />
                  </span>
                </div>
                <div className="app-card p-3">
                  <LineChart points={weekly} color="var(--brand)" unit="kg" />
                  <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                    최근 {weekly.length}주 · 월요일 시작
                  </p>
                </div>
              </section>
            ) : null}

            {/* 개인 기록 — "언제 이 무게에 올라섰나"가 성장의 가장 또렷한 증거다. */}
            {newPrs.length > 0 ? (
              <section>
                <h2 className="app-section-label">최근 30일 새 기록</h2>
                <ul className="app-list">
                  {newPrs.map((pr) => (
                    <li
                      key={`${pr.exerciseId}-${pr.kind}`}
                      className="flex min-h-11 items-center justify-between gap-2 px-3 text-sm"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <Trophy aria-hidden="true" size={15} className="shrink-0 text-warn" />
                        <span className="truncate text-zinc-900 dark:text-zinc-100">{pr.name}</span>
                      </span>
                      <span className="shrink-0 tabular-nums text-zinc-500 dark:text-zinc-400">
                        {pr.kind === "oneRm" ? "추정 1RM" : "최고 중량"}{" "}
                        <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {pr.value}kg
                        </strong>
                        <span className="ml-1.5 text-xs">{pr.date.slice(5).replace("-", "/")}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {/* 종목별 1RM */}
            <section>
              <h2 className="app-section-label">종목별 추정 1RM 추이</h2>
              {/* 추천이 명령처럼 읽히지 않게 — 한 줄만 남긴다(growth-record E2E 가 확인). */}
              <p className="mb-2 px-1 text-xs text-zinc-500 dark:text-zinc-400">
                추천은 기록 기반 제안이에요 — 그대로 따르지 않아도 됩니다.
              </p>
              {exerciseCharts.length === 0 ? (
                <p className="app-card p-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
                  중량 기록이 더 쌓이면 표시됩니다
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {exerciseCharts.map((e) => {
                    const best = Math.max(...e.series.map((p) => p.value));
                    return (
                      <div key={e.exerciseId} className="app-card p-3">
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-zinc-950 dark:text-zinc-100">
                            {e.name}
                          </p>
                          <TrendBadge pct={trendPct(e.series)} />
                        </div>
                        <LineChart points={e.series} color="var(--brand)" unit="kg" height={120} />
                        <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                          최고 추정 1RM{" "}
                          <strong className="font-semibold text-zinc-900 dark:text-zinc-100">{best}kg</strong>
                          {e.unilateral ? (
                            <span className="ml-1.5 rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-semibold text-zinc-600 dark:bg-white/[0.08] dark:text-zinc-300">
                              한쪽 기준
                            </span>
                          ) : null}
                        </p>
                        {e.advice ? (
                          <div className="mt-2">
                            <OverloadHint advice={e.advice} />
                          </div>
                        ) : null}
                        {e.history.length > 0 ? (
                          <ul className="mt-2 space-y-0.5 border-t border-[var(--line)] pt-2 text-xs text-zinc-500 dark:text-zinc-400">
                            {e.history.map((h) => (
                              <li key={h.date} className="flex justify-between gap-2 tabular-nums">
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
          </>
        )}
      </main>
    </div>
  );
}
