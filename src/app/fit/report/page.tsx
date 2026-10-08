import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { getCurrentUser } from "@/lib/supabase/server";
import { getFitAccess } from "@/features/routine/fit-access";
import { loadFitGrowth, loadFitHeaderInfo } from "@/features/routine/fit-data";
import { loadLiteReports } from "@/features/lite/reports-data";
import { LiteReportCards } from "@/features/lite/components/lite-reports";
import { loadBodyPhotos } from "@/features/lite/body-photos-data";
import { BodyPhotosCard } from "@/features/lite/components/body-photos-card";
import { loadGoals } from "@/features/lite/goals-data";
import { GoalsCard } from "@/features/lite/components/goals-card";
import { BODY_PART_LABEL } from "@/features/routine/exercise-catalog-labels";
import { FitHeader, FitLocked, styleTextOf } from "@/features/routine/components/fit-shell";
import { deltaMark, growthEnds, shortVolume } from "@/features/routine/fit-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "기록" };

function Delta({ now, prev, unit }: { now: number; prev: number; unit: string }) {
  const d = deltaMark(now, prev);
  if (d.mark === "same") return <span className="text-xs text-zinc-400">―</span>;
  return (
    <span className={`text-xs font-semibold ${d.mark === "up" ? "text-brand" : "text-zinc-500"}`}>
      {d.mark === "up" ? "▲" : "▼"} {d.diff.toLocaleString("ko-KR")}
      {unit}
    </span>
  );
}

/**
 * 맞춤 운동 · 기록(2026-10-07 한 화면 개편 — 예전 '성장' + '리포트').
 * 이번 달 숫자 3칸(지난달 대비) → 내 목표 → 종목 성장(양끝 무게·선) → 신기록 → 나머지 리포트 → 올해 돌아보기.
 */
export default async function FitRecordPage() {
  if (!(await getCurrentUser())) redirect("/login?redirect=/fit/report");
  const access = await getFitAccess();
  if (!access.visible) notFound();
  const full = access.full;
  const [info, growth, goals, lite, photos] = await Promise.all([
    loadFitHeaderInfo(),
    loadFitGrowth(),
    loadGoals(),
    full ? loadLiteReports() : null,
    full ? loadBodyPhotos(3) : null,
  ]);
  if (!growth) redirect("/login?redirect=/fit/report");
  const m = Number(growth.month.slice(5));
  const t = growth.thisMonth;
  const l = growth.lastMonth;

  return (
    <div className="app-page" data-testid="fit-page" data-full={full ? "1" : "0"}>
      <FitHeader title="기록" full={full} styleText={styleTextOf(info.style)} experienceLabel={info.experienceLabel} />
      <main className="app-container space-y-3">
        <section className="app-card space-y-3 p-4" data-testid={full ? "fit-report" : "fit-month"}>
          <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100" data-testid="fit-headline">
            {t.days === 0 ? `${m}월 기록이 아직 없어요` : `${m}월에 ${t.days}일 운동`}
          </p>
          {full ? (
            <dl className="grid grid-cols-3 gap-2">
              {[
                { label: "운동한 날", value: `${t.days}일`, now: t.days, prev: l.days, unit: "일" },
                { label: "총 볼륨", value: shortVolume(t.volumeKg), now: t.volumeKg, prev: l.volumeKg, unit: "kg" },
                { label: "신기록", value: `${t.prs}개`, now: t.prs, prev: l.prs, unit: "개" },
              ].map((r) => (
                <div key={r.label} className="min-w-0">
                  <dt className="text-xs text-zinc-500 dark:text-zinc-400">{r.label}</dt>
                  <dd className="text-base font-bold tabular-nums text-zinc-900 dark:text-zinc-100">{r.value}</dd>
                  <dd className="tabular-nums">
                    <Delta now={r.now} prev={r.prev} unit={r.unit} />
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
          {full && growth.topPart && growth.lackingPart ? (
            <p className="border-t border-[var(--line)] pt-2.5 text-xs text-zinc-600 dark:text-zinc-300" data-testid="fit-report-next">
              가장 많이 <b>{BODY_PART_LABEL[growth.topPart as keyof typeof BODY_PART_LABEL]}</b> · 다음 달엔{" "}
              <b className="text-brand">{BODY_PART_LABEL[growth.lackingPart as keyof typeof BODY_PART_LABEL]}</b>
            </p>
          ) : null}
        </section>

        {goals ? <GoalsCard view={goals} /> : null}

        {full ? (
          <section className="app-card p-4" data-testid="fit-growth">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">종목 성장</h2>
            {growth.growth.length === 0 ? (
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">무게를 기록하면 종목별로 보여요</p>
            ) : (
              <ul className="mt-1 divide-y divide-[var(--line)]">
                {growth.growth.map((g) => {
                  const ends = growthEnds(g.series);
                  return (
                    <li key={g.exerciseId} className="flex items-center gap-3 py-2.5" data-testid={`fit-growth-${g.exerciseId}`}>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{g.name}</span>
                        <span className="block truncate text-xs tabular-nums text-zinc-500 dark:text-zinc-400" data-testid="fit-growth-ends">
                          {ends ? `${ends.from} → ${ends.to}` : "기록 1회 더 필요"}
                        </span>
                      </span>
                      <svg viewBox="0 0 200 36" className="h-6 w-16 shrink-0" role="img" aria-label={`${g.name} 예상 1RM 추이`}>
                        <polyline points={g.points} fill="none" className="stroke-brand" strokeWidth="3" />
                      </svg>
                      <span
                        className={`w-14 shrink-0 text-right text-xs font-semibold tabular-nums ${
                          g.stalled ? "text-warn" : ends && ends.diffKg > 0 ? "text-brand" : "text-zinc-400"
                        }`}
                      >
                        {g.stalled ? "정체" : ends ? `${ends.diffKg > 0 ? "+" : ""}${ends.diffKg}kg` : "―"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ) : null}

        <section className="app-card p-4" data-testid="fit-prs">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">신기록</h2>
          {growth.prs.length ? (
            <ul className="mt-1 divide-y divide-[var(--line)]">
              {growth.prs.map((p) => (
                <li key={`${p.date}-${p.exerciseId}`} className="flex justify-between py-2 text-xs text-zinc-700 dark:text-zinc-200">
                  <span>
                    {Number(p.date.slice(5, 7))}/{Number(p.date.slice(8, 10))} {p.name}
                  </span>
                  <span className="tabular-nums">
                    {p.oneRmKg}kg <span className="text-brand">+{p.gainKg}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">아직 없어요</p>
          )}
        </section>

        {lite ? <LiteReportCards r={lite} /> : null}
        {photos ? <BodyPhotosCard view={photos} /> : null}
        {!full ? <FitLocked what="월간 요약 · 종목 성장 · 체성분 · 식단 리포트" /> : null}

        {/* 종목별 기록 찾기(2026-10-08) — "지난달 데드리프트 몇 kg였지?" */}
        <Link
          href="/fit/records"
          className="app-card app-press flex items-center justify-between p-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100"
          data-testid="fit-records-link"
        >
          종목별 기록 찾기
          <ChevronRight aria-hidden="true" size={18} className="text-zinc-400" />
        </Link>

        <Link
          href="/fit/year"
          className="app-card app-press flex items-center justify-between p-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100"
          data-testid="fit-year-link"
        >
          올해 돌아보기
          <ChevronRight aria-hidden="true" size={18} className="text-zinc-400" />
        </Link>
      </main>
    </div>
  );
}
