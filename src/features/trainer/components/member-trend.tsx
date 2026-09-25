"use client";

import { useState } from "react";
import { BarChart3, Clock3, Dumbbell } from "lucide-react";
import type { ReportPeriod, summarizeMember } from "../member-report";

const metrics = [
  { id: "sets", label: "완료 세트", unit: "세트", Icon: Dumbbell },
  { id: "minutes", label: "운동 시간", unit: "분", Icon: Clock3 },
  { id: "volume", label: "볼륨", unit: "kg", Icon: BarChart3 },
] as const;

export function MemberTrend({ series, period }: {
  series: ReturnType<typeof summarizeMember>["series"];
  period: ReportPeriod;
}) {
  const [metric, setMetric] = useState<(typeof metrics)[number]["id"]>("sets");
  const [selected, setSelected] = useState<string | null>(null);
  const current = metrics.find(item => item.id === metric)!;
  const maximum = Math.max(1, ...series.map(row => row[metric]));
  const active = series.find(row => row.label === selected) ?? [...series].reverse().find(row => row[metric] > 0) ?? series.at(-1);
  const hasValues = series.some(row => row[metric] > 0);
  return <section aria-labelledby="trend-title" className="app-card overflow-hidden">
    <div className="space-y-4 p-5 sm:p-6">
      <div><h2 id="trend-title" className="text-lg font-bold">{period === "year" ? "월별" : "일별"} 운동 추이</h2><p className="mt-1 text-sm text-muted">막대를 누르면 해당 기간의 기록을 볼 수 있어요.</p></div>
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800" aria-label="그래프 지표">{metrics.map(({ id, label, Icon }) => <button key={id} type="button" aria-pressed={metric === id} onClick={() => setMetric(id)} className={`flex min-h-11 items-center justify-center gap-1 rounded-lg px-2 text-sm font-semibold ${metric === id ? "bg-white shadow-sm dark:bg-zinc-950" : "text-muted"}`}><Icon size={15} aria-hidden="true" /><span>{label}</span></button>)}</div>
      <div aria-live="polite" className="flex min-h-16 items-center justify-between gap-3"><div><p className="text-sm text-muted">{active?.label ?? "선택한 기간"}</p><p className="mt-1 text-2xl font-bold tabular-nums">{(active?.[metric] ?? 0).toLocaleString("ko-KR")}<span className="ml-1 text-sm font-medium text-muted">{current.unit}</span></p></div><p className="text-right text-sm text-muted">{active ? `${active.sets}세트 · ${active.minutes}분` : "기록 없음"}<br />{active ? `볼륨 ${active.volume.toLocaleString("ko-KR")}kg` : ""}</p></div>
      {!hasValues && <p className="rounded-xl bg-zinc-100 px-4 py-3 text-sm text-muted dark:bg-zinc-800">이 기간에는 {current.label} 기록이 없어요.</p>}
      <div className="overflow-x-auto pb-2">
        <div className="flex h-44 items-end gap-1 border-b border-line" style={{ minWidth: series.length * 44 }} aria-label={`기간별 ${current.label} 그래프`}>
          {series.map(row => <button type="button" key={row.label} aria-label={`${row.label} ${row[metric].toLocaleString("ko-KR")}${current.unit}`} aria-pressed={active?.label === row.label} onClick={() => setSelected(row.label)} className="group flex h-full min-w-11 flex-1 flex-col items-center justify-end gap-2 rounded-t-lg px-1 pb-2 outline-offset-2 hover:bg-brand/5 focus-visible:outline-2 focus-visible:outline-brand">
            <span className={`text-xs tabular-nums ${active?.label === row.label ? "font-bold text-brand" : "text-muted"}`}>{row[metric] > 0 ? row[metric].toLocaleString("ko-KR") : ""}</span>
            <span className={`w-full max-w-8 rounded-t-lg transition-[height] motion-reduce:transition-none ${active?.label === row.label ? "bg-brand" : "bg-brand/30 group-hover:bg-brand/60"}`} style={{ height: row[metric] ? row[metric] / maximum * 100 : 3 }} />
            <span className="whitespace-nowrap text-xs text-muted">{period === "year" ? `${Number(row.label.slice(5))}월` : `${Number(row.label.slice(5, 7))}/${Number(row.label.slice(8))}`}</span>
          </button>)}
        </div>
      </div>
    </div>
    <details className="border-t border-line px-5 sm:px-6"><summary className="cursor-pointer py-4 text-sm font-semibold">날짜별 상세 기록</summary>
      <ul className="divide-y divide-line pb-3">{series.map(row => <li key={row.label} className="flex items-center justify-between gap-3 py-3 text-sm"><span className="font-medium">{row.label.slice(5)}</span><div className="text-right"><p className="font-semibold tabular-nums">{row.sets}세트 · {row.minutes}분</p><p className="mt-1 text-xs text-muted">운동 {row.workoutDays}일 · 볼륨 {row.volume.toLocaleString("ko-KR")}kg</p></div></li>)}</ul>
    </details>
  </section>;
}