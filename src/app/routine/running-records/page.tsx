import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, Footprints } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/supabase/server";
import { seoulYmd } from "@/features/routine/data";
import { getRunSessionsRange } from "@/features/running/run-history-data";
import { RunHistoryList } from "@/features/running/components/run-history-list";
import {
  formatRunDuration,
  formatRunKm,
  formatRunPaceShort,
  groupRunsByWeek,
  monthRange,
  resolveRunMonth,
  runMonthDelta,
  runMonthWeeks,
  shiftMonth,
  summarizeRuns,
} from "@/features/running/run-records-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "런닝 기록" };

/**
 * 런닝 기록(B안, 2026-09-27) — 이번 달 거리 하나를 크게 + 지난달 대비 + 주별 막대,
 * 목록은 주 단위로 묶고 줄을 누르면 기록 상세(/routine/running-records/[id]).
 * 제목은 브랜드 머리글 하나(앱 탭 규칙), 이번 달보다 뒤로는 못 간다.
 */
export default async function RunningRecordsPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  if (!await getCurrentUser()) redirect("/login?redirect=/routine/running-records");
  const today = seoulYmd();
  const month = resolveRunMonth((await searchParams).m, today);
  const range = monthRange(month);
  const prevRange = monthRange(shiftMonth(month, -1));
  const [rows, prevRows] = await Promise.all([
    getRunSessionsRange(range.from, range.to),
    getRunSessionsRange(prevRange.from, prevRange.to),
  ]);
  const totals = summarizeRuns(rows);
  const delta = runMonthDelta(totals.distanceM, summarizeRuns(prevRows).distanceM);
  const weeks = runMonthWeeks(month, rows, today);
  const maxWeek = Math.max(...weeks.map((w) => w.distanceM), 1);
  const groups = groupRunsByWeek(rows, today);
  const [year, number] = month.split("-").map(Number);
  const isCurrent = month === today.slice(0, 7);

  return <div className="app-page">
    <PageHeader branded title="런닝 기록">
      <Link href="/running" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white dark:text-zinc-950"><Footprints size={18} aria-hidden="true" />런닝 시작</Link>
    </PageHeader>
    <main className="app-container space-y-5">
      <nav aria-label="런닝 기록 월 선택" className="flex items-center justify-between">
        <Link href={`?m=${shiftMonth(month, -1)}`} aria-label="이전 달" className="flex h-11 w-11 items-center justify-center"><ChevronLeft aria-hidden="true" /></Link>
        <h2 className="font-semibold">{year}년 {number}월</h2>
        {isCurrent
          ? <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center opacity-25"><ChevronRight /></span>
          : <Link href={`?m=${shiftMonth(month, 1)}`} aria-label="다음 달" className="flex h-11 w-11 items-center justify-center"><ChevronRight aria-hidden="true" /></Link>}
      </nav>

      <section aria-label="이달 요약" className="app-card space-y-3 p-5">
        <div>
          <p className="text-xs text-muted">{number}월 달린 거리</p>
          <p className="text-[28px] font-bold tracking-tight tabular-nums">{formatRunKm(totals.distanceM)}<span className="ml-1 text-base font-semibold text-muted">km</span></p>
        </div>
        {delta ? <p className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${delta.trend === "up" ? "bg-brand/10 text-brand" : "bg-[var(--line)] text-muted"}`}>{delta.trend === "up" ? "▲ " : delta.trend === "down" ? "▼ " : ""}{delta.text}</p> : null}
        <dl className="flex flex-wrap gap-x-4 gap-y-1 text-sm tabular-nums">
          <div className="flex gap-1"><dt className="text-muted">횟수</dt><dd className="font-semibold">{totals.sessions}회</dd></div>
          <div className="flex gap-1"><dt className="text-muted">시간</dt><dd className="font-semibold">{formatRunDuration(totals.durationSec)}</dd></div>
          <div className="flex gap-1"><dt className="text-muted">평균 페이스</dt><dd className="font-semibold">{formatRunPaceShort(totals.paceSecPerKm)}</dd></div>
        </dl>
        <ol aria-label="주별 거리" className="grid h-24 items-end gap-2" style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }}>
          {weeks.map((w) => (
            <li key={w.from} className="flex h-full flex-col items-center justify-end gap-1" aria-label={`${w.label} ${formatRunKm(w.distanceM)}km`}>
              <span className="text-xs font-semibold tabular-nums">{w.distanceM > 0 ? formatRunKm(w.distanceM) : "–"}</span>
              <span className={`block w-full rounded-t ${w.current ? "bg-brand" : "bg-brand/30"}`} style={{ height: `${w.distanceM > 0 ? Math.max(6, Math.round((w.distanceM / maxWeek) * 52)) : 2}px` }} />
              <span className={`text-xs ${w.current ? "font-semibold text-brand" : "text-muted"}`}>{w.label}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-4" aria-label="주별 런닝 기록">
        {groups.length === 0
          ? <div className="app-card"><RunHistoryList rows={[]} emptyText="이 달에는 저장된 런닝이 없어요. 런닝을 마치면 여기에 쌓여요." /></div>
          : groups.map((g) => (
            <div key={g.key} className="space-y-2">
              <h3 className="flex justify-between px-1 text-xs font-semibold text-muted"><span>{g.label}</span><span className="tabular-nums text-foreground">{formatRunKm(g.distanceM)}km</span></h3>
              <div className="app-card overflow-hidden"><RunHistoryList rows={g.rows} /></div>
            </div>
          ))}
      </section>
    </main>
  </div>;
}
