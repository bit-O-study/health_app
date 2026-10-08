import Link from "next/link";
import { Lock, Trophy } from "lucide-react";

import { getCatalogExercise } from "@/features/routine/exercise-catalog";
import { BODY_PART_LABEL, type BodyPart } from "@/features/routine/exercise-catalog-labels";
import { shortVolume, whenText } from "@/features/routine/fit-view";
import { compareText } from "@/features/lite/session-report";
import { loadSessionReport } from "@/features/lite/session-report-data";

const name = (id: string) => getCatalogExercise(id)?.name ?? id;
const md = (ymd: string) => `${Number(ymd.slice(5, 7))}/${Number(ymd.slice(8, 10))}`;
const kgReps = (t: { kg: number; reps: number }) => `${t.kg}kg×${t.reps}`;
const signedKg = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : "±"}${shortVolume(Math.abs(n))}`;

/**
 * 운동 탭 · 오늘 운동 리포트(2026-10-08). 오늘 운동을 하나라도 끝내면 나온다.
 * 라이트: 지난 같은 부위 날 대비 볼륨 · 종목별 지난번 대비 · 오늘 신기록 · 이번 주 몇 일째.
 * 무료: 오늘 총량 한 줄 + 잠금.
 */
export async function SessionReportCard() {
  const data = await loadSessionReport().catch(() => null);
  if (!data) return null;
  const { report: r, full, ready } = data;
  const diff = r.lastSamePart ? r.volumeKg - r.lastSamePart.volumeKg : null;

  return (
    <section className="app-card space-y-3 p-4" data-testid="session-report">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">오늘 운동 리포트</h2>
        {full ? <span className="text-xs text-zinc-500 dark:text-zinc-400">이번 주 {r.weekDays}일째</span> : null}
      </div>
      <p className="text-sm tabular-nums text-zinc-700 dark:text-zinc-200">
        {r.exercises}개 · {r.sets}세트{r.volumeKg > 0 ? ` · ${shortVolume(r.volumeKg)}` : ""}
        {full && r.mainPart && diff !== null && r.lastSamePart ? (
          <span className={diff >= 0 ? "font-semibold text-brand" : "text-zinc-500 dark:text-zinc-400"} data-testid="session-report-vs">
            {" "}· 지난 {BODY_PART_LABEL[r.mainPart as BodyPart]} 날({md(r.lastSamePart.date)})보다 {diff >= 0 ? "▲" : "▼"} {shortVolume(Math.abs(diff))}
          </span>
        ) : null}
      </p>

      {full ? (
        <>
          {r.prs.length ? (
            <div className="flex flex-wrap gap-1.5" data-testid="session-report-prs">
              {r.prs.map((p) => (
                <span key={p.exerciseId} className="inline-flex items-center gap-1 rounded-full bg-warn/10 px-2.5 py-1 text-xs font-semibold text-warn">
                  <Trophy aria-hidden="true" size={12} /> {name(p.exerciseId)} 신기록 +{p.gainKg}kg
                </span>
              ))}
            </div>
          ) : null}
          {r.compares.length ? (
            <ul className="divide-y divide-zinc-100 dark:divide-white/[0.06]" data-testid="session-report-compares">
              {r.compares.slice(0, 5).map((c) => (
                <li key={c.exerciseId} className="space-y-0.5 py-1.5">
                  <div className="flex items-baseline gap-2 text-sm">
                    <span className="min-w-0 flex-1 truncate text-zinc-800 dark:text-zinc-100">{name(c.exerciseId)}</span>
                    <span className="shrink-0 tabular-nums text-zinc-500 dark:text-zinc-400">
                      {c.prev ? `${kgReps(c.prev)} → ` : ""}<b className="text-zinc-900 dark:text-zinc-100">{kgReps(c.now)}</b>
                    </span>
                    <span className={`w-20 shrink-0 text-right text-xs font-semibold tabular-nums ${c.better ? "text-brand" : "text-zinc-400"}`}>
                      {compareText(c)}
                    </span>
                  </div>
                  {c.prevDate && c.prevVolumeKg != null ? (
                    <p className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400" data-testid={`session-report-detail-${c.exerciseId}`}>
                      지난번 {md(c.prevDate)} 대비 · 볼륨 {shortVolume(c.nowVolumeKg)}({signedKg(c.nowVolumeKg - c.prevVolumeKg)})
                      {c.nowOneRmKg > 0 && c.prevOneRmKg ? ` · 예상 최대 ${c.nowOneRmKg}kg(${c.nowOneRmKg >= c.prevOneRmKg ? "+" : "−"}${Math.abs(Math.round((c.nowOneRmKg - c.prevOneRmKg) * 10) / 10)})` : ""}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
          {ready.length ? (
            <p className="border-t border-zinc-100 pt-2 text-xs text-zinc-600 dark:border-white/[0.06] dark:text-zinc-300" data-testid="session-report-ready">
              다시 하기 좋은 때 · {ready.map((x) => `${BODY_PART_LABEL[x.part as BodyPart]} ${whenText(x.at)}`).join(" · ")}
            </p>
          ) : null}
        </>
      ) : (
        <Link href="/settings/subscription" className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400" data-testid="session-report-locked">
          <Lock aria-hidden="true" size={12} /> 지난번 대비 · 신기록 · 이번 주 기록은 라이트(월 990원)에서
        </Link>
      )}
    </section>
  );
}
