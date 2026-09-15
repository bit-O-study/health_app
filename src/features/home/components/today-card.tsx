import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";

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

/**
 * 홈 '오늘' 카드 — 오늘의 다짐 + 식단 기준 운동량을 **한 장**에, 줄마다 누르면 원래 화면으로.
 * 설명 문구는 최소로(2026-09-15 "글씨가 너무 많아, 간결하게").
 *
 * 서버 컴포넌트 — 숫자만 받아 그린다.
 */
export function TodayCard({
  dateLabel,
  commitments,
  need,
  macroRemaining,
  hasFoodLog,
}: {
  dateLabel: string;
  commitments: TodayCommitment[];
  need: DietExerciseNeed;
  macroRemaining: MacroRemaining;
  hasFoodLog: boolean;
}) {
  const doneCount = commitments.filter((c) => c.done).length;

  return (
    <section
      data-testid="home-today"
      aria-labelledby="home-today-title"
      className="app-card"
    >
      <h2
        id="home-today-title"
        className="flex items-baseline gap-2 px-4 pt-3.5 text-lg font-bold text-zinc-900 dark:text-zinc-100"
      >
        오늘
        <span className="text-sm font-normal text-zinc-500 dark:text-zinc-400">
          {dateLabel}
        </span>
      </h2>

      <Link href="/commitments" className="block px-4 pb-3 pt-2 transition active:opacity-60">
        <span className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
          오늘의 다짐
          {commitments.length > 0 ? (
            <span className="tabular-nums">
              {doneCount}/{commitments.length}
            </span>
          ) : (
            <span className="text-zinc-400 dark:text-zinc-500">없음</span>
          )}
          <ChevronRight aria-hidden="true" size={16} className="ml-auto shrink-0 text-zinc-400" />
        </span>
        {commitments.length > 0 ? (
          <ul className="mt-2 space-y-2">
            {commitments.map((c) => (
              <li key={c.id} className="flex min-w-0 items-center gap-2.5">
                <span
                  className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border transition ${
                    c.done
                      ? "border-brand bg-brand text-white dark:text-zinc-950"
                      : "border-zinc-300 dark:border-zinc-600"
                  }`}
                >
                  {c.done ? <Check aria-hidden="true" size={11} strokeWidth={3} /> : null}
                </span>
                <span
                  className={`text-safe min-w-0 flex-1 text-base leading-5 ${
                    c.done
                      ? "text-zinc-400 line-through dark:text-zinc-500"
                      : "text-zinc-900 dark:text-zinc-100"
                  }`}
                >
                  {c.title}
                </span>
                <span className="max-w-24 shrink-0 truncate text-sm tabular-nums text-zinc-400 dark:text-zinc-500">
                  {c.valueText}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </Link>

      <div className="ml-4 border-t border-[var(--line)]" />

      <Link
        href="/diet"
        className="flex items-center gap-2 px-4 py-3 text-sm transition active:opacity-60"
      >
        {!hasFoodLog ? (
          <span className="flex-1 text-zinc-500 dark:text-zinc-400">오늘 식단 기록이 없어요</span>
        ) : (
          <>
            <span className="text-zinc-500 dark:text-zinc-400">식단</span>
            <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
              {need.neededKcal === 0 ? "목표 이내" : `${need.remainingMinutes}분 더 운동`}
            </span>
            <span className="ml-auto flex gap-2 tabular-nums text-zinc-500 dark:text-zinc-400">
              {MACROS.map(({ key, label }) => (
                <span key={key}>
                  {label} <span className="text-zinc-900 dark:text-zinc-100">{macroRemaining[key]}g</span>
                </span>
              ))}
            </span>
          </>
        )}
        <ChevronRight aria-hidden="true" size={16} className="shrink-0 text-zinc-400" />
      </Link>
    </section>
  );
}
