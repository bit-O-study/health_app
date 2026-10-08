import { BODY_PART_LABEL, type BodyPart } from "@/features/routine/exercise-catalog-labels";
import type { RecoveryRow } from "@/features/routine/fit-insights";

/**
 * 맞춤 운동 · 부위별 회복(2026-10-08) — 최근 운동량과 끝낸 시각으로 계산한 회복 정도.
 * 다 풀린 부위는 초록 '회복됨', 아직이면 남은 시간. 절반도 안 풀렸으면 주황.
 */
export function FitRecovery({ rows }: { rows: RecoveryRow[] }) {
  const tired = rows.filter((r) => r.pct < 100).length;
  return (
    <section className="app-card space-y-2.5 p-4" data-testid="fit-recovery">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">부위별 회복</h2>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">{tired === 0 ? "다 회복됐어요" : `${tired}곳 회복 중`}</span>
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3">
        {rows.map((r) => {
          const done = r.pct >= 100;
          const low = r.pct < 50;
          return (
            <li key={r.part} className="min-w-0 space-y-1" data-testid={`fit-recovery-${r.part}`}>
              <div className="flex items-baseline justify-between gap-1 text-xs">
                <span className="font-semibold text-zinc-800 dark:text-zinc-100">{BODY_PART_LABEL[r.part as BodyPart]}</span>
                <span className={`tabular-nums ${done ? "text-brand" : low ? "font-semibold text-warn" : "text-zinc-500 dark:text-zinc-400"}`}>
                  {done ? "회복됨" : `${r.hoursLeft}시간 남음`}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-white/[0.08]" aria-hidden="true">
                <div className={`h-full rounded-full ${done ? "bg-brand" : low ? "bg-warn" : "bg-brand/50"}`} style={{ width: `${Math.max(4, r.pct)}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-zinc-400">최근 운동량(세트)과 끝낸 시각으로 계산 · 참고용</p>
    </section>
  );
}
