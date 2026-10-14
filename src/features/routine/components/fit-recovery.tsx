import { BODY_PART_LABEL, type BodyPart } from "@/features/routine/exercise-catalog-labels";
import { fmtSets, whenText } from "@/features/routine/fit-view";
import type { RecoveryRow } from "@/features/routine/fit-insights";

/** 내 소화량에 견준 양 — "내 소화량의 80%" · 넘겼으면 "평소보다 20% 더". */
export function loadText(loadPct: number): string {
  return loadPct > 100 ? `평소보다 ${loadPct - 100}% 더` : `내 소화량의 ${loadPct}%`;
}

/** 회복 중인 이유 한 줄 — "10/7 저녁 · 12세트 · 내 소화량의 80% · 무거운 무게 · 피로 누적". */
export function recoveryReason(r: RecoveryRow): string {
  if (!r.lastAt) return "";
  const bits = [whenText(r.lastAt), `${fmtSets(r.sets)}세트`, loadText(r.loadPct)];
  if (r.intensity === "heavy") bits.push("무거운 무게");
  if (r.intensity === "light") bits.push("가벼운 무게");
  if (r.stacked) bits.push("피로 누적");
  if (r.condition.includes("soreness")) bits.push("근육통");
  if (r.condition.includes("sleep")) bits.push("잠 부족");
  return bits.join(" · ");
}

/**
 * 맞춤 운동 · 부위별 회복(2026-10-08) — 근육 크기 · 강도 · 쌓인 피로 · 오늘 체크인으로 계산.
 * 🔴 2026-10-14 — "했으면 회복"이 아니라 **내 소화량에 견줘 얼마나 했는가**로 시간을 정한다.
 *    가볍게 한 부위는 '회복됨'으로 두고 "가볍게 해서 회복이 필요 없어요"라고 알려 준다.
 * 다 풀린 부위는 초록 '회복됨', 아직이면 남은 시간과 이유. 절반도 안 풀렸으면 주황.
 * 회복 중인 부위를 먼저(덜 풀린 순) — 오늘 피할 곳이 위에 보이게.
 */
export function FitRecovery({ rows }: { rows: RecoveryRow[] }) {
  const sorted = [...rows].sort((a, b) => a.pct - b.pct);
  const tired = rows.filter((r) => r.pct < 100).length;
  return (
    <section className="app-card space-y-2.5 p-4" data-testid="fit-recovery">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">부위별 회복</h2>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">{tired === 0 ? "다 회복됐어요" : `${tired}곳 회복 중`}</span>
      </div>
      <ul className="space-y-2.5">
        {sorted.map((r) => {
          const done = r.pct >= 100;
          const low = r.pct < 50;
          return (
            <li key={r.part} className="space-y-1" data-testid={`fit-recovery-${r.part}`}>
              <div className="flex items-baseline gap-2 text-xs">
                <span className="w-9 shrink-0 font-semibold text-zinc-800 dark:text-zinc-100">{BODY_PART_LABEL[r.part as BodyPart]}</span>
                <div className="h-1.5 min-w-0 flex-1 self-center overflow-hidden rounded-full bg-zinc-100 dark:bg-white/[0.08]" aria-hidden="true">
                  <div className={`h-full rounded-full ${done ? "bg-brand" : low ? "bg-warn" : "bg-brand/50"}`} style={{ width: `${Math.max(4, r.pct)}%` }} />
                </div>
                <span className={`w-20 shrink-0 text-right tabular-nums ${done ? "text-brand" : low ? "font-semibold text-warn" : "text-zinc-500 dark:text-zinc-400"}`}>
                  {done ? "회복됨" : `${r.pct}% · ${r.hoursLeft}시간`}
                </span>
              </div>
              {!done ? (
                <p className="pl-11 text-xs text-zinc-500 dark:text-zinc-400" data-testid={`fit-recovery-why-${r.part}`}>
                  {recoveryReason(r)}
                </p>
              ) : r.easy ? (
                <p className="pl-11 text-xs text-zinc-500 dark:text-zinc-400" data-testid={`fit-recovery-easy-${r.part}`}>
                  {whenText(r.easy.at)} · {loadText(r.easy.loadPct)} · 가볍게 해서 회복이 필요 없어요
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
      <p className="sentences text-xs leading-5 text-zinc-400">
        <span>내 기록(종목별 최대 무게·평소 하던 양)과 골격근량에 견줘, 얼마나 힘들게 했는지로 계산해요.</span>
        <span>평소의 4분의 1이 안 되면 회복이 필요 없어요.</span>
        <span>작은 근육(팔·어깨·코어)은 빨리, 하체는 오래 걸리고 덜 풀린 채 또 하면 더 길어져요.</span>
        <span>오늘 근육통·잠 체크인도 반영해요 · 참고용</span>
      </p>
    </section>
  );
}
