import Link from "next/link";
import { ChevronRight, Target, UtensilsCrossed } from "lucide-react";

import type {
  DietExerciseNeed,
  MacroRemaining,
} from "@/features/home/dashboard-metrics";
import type { TodayCommitment } from "@/features/home/home-data";

const MACROS: { key: keyof MacroRemaining; label: string }[] = [
  { key: "carbs", label: "탄" },
  { key: "protein", label: "단" },
  { key: "fat", label: "지" },
];

const ROW =
  "flex min-h-[4.5rem] items-center gap-3 px-4 py-3 transition active:bg-zinc-100 dark:active:bg-white/[0.06]";
const ICON =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand";

/**
 * 홈 '오늘' — 오늘의 다짐 · 식단 **두 줄 목록**(깔끔·촘촘, 2026-09-15).
 * 큰 "없음"·"다짐 만들기" 같은 빈 글자는 쓰지 않는다 — 값이 없으면 오른쪽에 짧게 `추가`만.
 *
 * 서버 컴포넌트 — 숫자만 받아 그린다.
 */
export function TodayCard({
  commitments,
  need,
  macroRemaining,
  hasFoodLog,
}: {
  /** 예전 호출부 호환용 */
  dateLabel?: string;
  commitments: TodayCommitment[];
  need: DietExerciseNeed;
  macroRemaining: MacroRemaining;
  hasFoodLog: boolean;
}) {
  const doneCount = commitments.filter((c) => c.done).length;
  const nextTitle = commitments.find((c) => !c.done)?.title ?? commitments[0]?.title;

  return (
    <section data-testid="home-today" aria-label="오늘" className="app-list">
      <Link href="/commitments" aria-label="오늘의 다짐" className={ROW}>
        <span className={ICON}>
          <Target aria-hidden="true" size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">오늘의 다짐</span>
          {nextTitle ? (
            <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">{nextTitle}</span>
          ) : null}
        </span>
        <span className="shrink-0 text-sm font-semibold tabular-nums text-zinc-500 dark:text-zinc-400">
          {commitments.length > 0 ? `${doneCount}/${commitments.length}` : "추가"}
        </span>
        <ChevronRight aria-hidden="true" size={16} className="shrink-0 text-zinc-400" />
      </Link>

      <div className="ml-[4.25rem] border-t border-[var(--line)]" />

      <Link href="/diet" aria-label={hasFoodLog ? "식단" : "오늘 식단 기록이 없어요"} className={ROW}>
        <span className={ICON}>
          <UtensilsCrossed aria-hidden="true" size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">식단</span>
          {hasFoodLog ? (
            <span className="flex flex-wrap gap-x-1.5 text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
              {MACROS.map(({ key, label }) => (
                <span key={key}>
                  {label} <span className="text-zinc-800 dark:text-zinc-200">{macroRemaining[key]}g</span>
                </span>
              ))}
            </span>
          ) : null}
        </span>
        <span className="shrink-0 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
          {!hasFoodLog ? "추가" : need.neededKcal === 0 ? "목표 이내" : `${need.remainingMinutes}분 더`}
        </span>
        <ChevronRight aria-hidden="true" size={16} className="shrink-0 text-zinc-400" />
      </Link>
    </section>
  );
}
