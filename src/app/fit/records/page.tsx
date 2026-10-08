import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, Search, Trophy } from "lucide-react";

import { getCurrentUser } from "@/lib/supabase/server";
import { getFitAccess } from "@/features/routine/fit-access";
import { loadFitHeaderInfo } from "@/features/routine/fit-data";
import { getCatalogExercise } from "@/features/routine/exercise-catalog";
import { FitHeader, FitLocked, styleTextOf } from "@/features/routine/components/fit-shell";
import { shortVolume } from "@/features/routine/fit-view";
import { exerciseIndex, exerciseSessions, sessionSummary } from "@/features/lite/exercise-history";
import { sparkPoints } from "@/features/routine/fit-growth";
import { loadRecentRecords } from "@/features/lite/recent-records";

export const dynamic = "force-dynamic";
export const metadata = { title: "종목별 기록" };

const name = (id: string) => getCatalogExercise(id)?.name ?? id;
const md = (ymd: string) => `${Number(ymd.slice(5, 7))}/${Number(ymd.slice(8, 10))}`;
const norm = (s: string) => s.toLowerCase().replace(/\s/g, "");

/**
 * 맞춤 운동 · 종목별 기록 찾기(라이트, 2026-10-08) — "지난달 데드리프트 몇 kg였지?".
 * 최근 1년 한 종목 목록(이름으로 찾기) → 누르면 그 종목의 날짜별 세트·최고 기록.
 * 자바스크립트 없이 주소(?q= · ?ex=)로만 동작한다.
 */
export default async function FitRecordsPage({ searchParams }: { searchParams: Promise<{ q?: string; ex?: string }> }) {
  if (!(await getCurrentUser())) redirect("/login?redirect=/fit/records");
  const access = await getFitAccess();
  if (!access.visible) notFound();
  const { q = "", ex } = await searchParams;
  const [info, recent] = await Promise.all([loadFitHeaderInfo(), access.full ? loadRecentRecords(365) : null]);

  const index = recent ? exerciseIndex(recent.records) : [];
  const shown = q.trim() ? index.filter((r) => norm(name(r.exerciseId)).includes(norm(q))) : index;
  const sessions = recent && ex ? exerciseSessions(recent.records, ex) : null;
  const summary = sessions ? sessionSummary(sessions) : null;
  const trend = sessions ? [...sessions].reverse().filter((s) => s.oneRmKg > 0).map((s) => ({ date: s.date, value: s.oneRmKg })) : [];
  const best = sessions?.reduce<{ kg: number; reps: number; date: string } | null>(
    (a, s) => (s.top && (!a || s.top.kg > a.kg) ? { ...s.top, date: s.date } : a),
    null,
  );

  return (
    <div className="app-page" data-testid="fit-page" data-full={access.full ? "1" : "0"}>
      <FitHeader title="종목별 기록" full={access.full} styleText={styleTextOf(info.style)} experienceLabel={info.experienceLabel} />
      <main className="app-container space-y-3">
        {!access.full ? (
          <FitLocked what="종목별 기록 찾기 · 날짜별 세트 · 최고 기록" />
        ) : sessions && ex ? (
          <section className="app-card space-y-2 p-4" data-testid="fit-records-sessions">
            <Link href={`/fit/records${q ? `?q=${encodeURIComponent(q)}` : ""}`} className="inline-flex items-center gap-0.5 text-xs font-semibold text-brand">
              <ChevronLeft aria-hidden="true" size={14} /> 종목 목록
            </Link>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{name(ex)}</h2>
            {best ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-300" data-testid="fit-records-best">
                최고 <b className="text-zinc-900 dark:text-zinc-100">{best.kg}kg × {best.reps}회</b> · {md(best.date)}
              </p>
            ) : null}
            {summary ? (
              <div className="flex items-center gap-3" data-testid="fit-records-summary">
                <p className="min-w-0 flex-1 text-xs tabular-nums text-zinc-600 dark:text-zinc-300">
                  예상 최대 {summary.firstOneRmKg}kg → 최근 3번 평균 <b>{summary.recentOneRmKg}kg</b>
                  <span className={summary.changeKg > 0 ? " text-brand" : " text-zinc-500"}>
                    {" "}({summary.changeKg > 0 ? "+" : summary.changeKg < 0 ? "−" : "±"}{Math.abs(summary.changeKg)})
                  </span>
                  {summary.everyDays ? ` · 평균 ${summary.everyDays}일마다` : ""}
                </p>
                {trend.length >= 2 ? (
                  <svg viewBox="0 0 200 36" className="h-7 w-20 shrink-0" role="img" aria-label="예상 최대 추이">
                    <polyline points={sparkPoints(trend)} fill="none" className="stroke-brand" strokeWidth="3" />
                  </svg>
                ) : null}
              </div>
            ) : null}
            {sessions.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">최근 1년 기록이 없어요.</p>
            ) : (
              <ul className="divide-y divide-[var(--line)]">
                {sessions.map((s) => (
                  <li key={s.date} className="space-y-0.5 py-2.5">
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                        {md(s.date)}
                        {s.pr ? (
                          <span className="ml-1.5 inline-flex items-center gap-0.5 text-xs font-semibold text-warn">
                            <Trophy aria-hidden="true" size={11} /> 신기록
                          </span>
                        ) : null}
                      </span>
                      <span className="tabular-nums text-zinc-500 dark:text-zinc-400">
                        {s.sets}세트{s.volumeKg > 0 ? ` · ${shortVolume(s.volumeKg)}` : ""}
                        {s.oneRmKg > 0 ? ` · 예상 최대 ${s.oneRmKg}kg` : ""}
                      </span>
                    </div>
                    <p className="text-xs tabular-nums text-zinc-600 dark:text-zinc-300">{s.detail}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : (
          <>
            <form action="/fit/records" className="app-card flex items-center gap-2 p-2" role="search">
              <Search aria-hidden="true" size={16} className="ml-1.5 shrink-0 text-zinc-400" />
              <input
                id="fit-records-q"
                name="q"
                defaultValue={q}
                placeholder="종목 이름(예: 데드)"
                aria-label="종목 이름으로 찾기"
                className="h-10 min-w-0 flex-1 bg-transparent text-base outline-none"
              />
              <button type="submit" className="app-press h-9 shrink-0 rounded-full bg-brand px-3.5 text-sm font-semibold text-white dark:text-zinc-950">
                찾기
              </button>
            </form>
            <section className="app-card px-4" data-testid="fit-records-index">
              {shown.length === 0 ? (
                <p className="py-4 text-sm text-zinc-500 dark:text-zinc-400">{index.length === 0 ? "최근 1년 운동 기록이 없어요." : "찾는 종목이 없어요."}</p>
              ) : (
                <ul className="divide-y divide-[var(--line)]">
                  {shown.map((r) => (
                    <li key={r.exerciseId}>
                      <Link
                        href={`/fit/records?ex=${encodeURIComponent(r.exerciseId)}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                        className="flex items-center gap-2 py-3"
                        data-testid={`fit-records-ex-${r.exerciseId}`}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{name(r.exerciseId)}</span>
                          <span className="block text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                            {r.sessions}번 · 마지막 {md(r.lastDate)}
                          </span>
                        </span>
                        {r.bestKg ? <span className="shrink-0 text-sm tabular-nums text-zinc-700 dark:text-zinc-200">최고 {r.bestKg}kg</span> : null}
                        <ChevronRight aria-hidden="true" size={16} className="shrink-0 text-zinc-300 dark:text-zinc-600" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
