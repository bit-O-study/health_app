import Link from "next/link";
import { ArrowUpRight, UtensilsCrossed } from "lucide-react";

import type { DietExerciseNeed, MacroRemaining } from "@/features/home/dashboard-metrics";

const R = 40;
const CIRCUMFERENCE = 2 * Math.PI * R;

const MACRO_ROWS: { key: keyof MacroRemaining; label: string }[] = [
  { key: "carbs", label: "탄수화물" },
  { key: "protein", label: "단백질" },
  { key: "fat", label: "지방" },
];

/**
 * 홈 대시보드 — 왼쪽에 오늘 식단 기준 필요 운동량(원형 그래프),
 * 오른쪽에 탄단지 기준 더 먹어야 하는 양을 함께 보여준다. 눌러서 식단탭으로 이동.
 * 기록 유무와 상관없이 카드 높이는 고정(레이아웃이 안 튀게).
 */
export function DietExerciseCard({
  need,
  macroRemaining,
  hasFoodLog,
}: {
  need: DietExerciseNeed;
  macroRemaining: MacroRemaining;
  hasFoodLog: boolean;
}) {
  const dash = (CIRCUMFERENCE * need.pct) / 100;
  const noExtraNeeded = need.neededKcal === 0;

  return (
    <Link
      href="/diet"
      className="app-card group block p-4 transition hover:-translate-y-0.5 hover:border-emerald-500/20 sm:p-5"
    >
      <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
        오늘 식단 기준 운동량
      </p>
      <div className="flex min-h-[104px] items-center">
        {!hasFoodLog ? (
          <div className="flex w-full items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
              <UtensilsCrossed aria-hidden="true" size={22} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                오늘 식단 기록이 없어요
              </p>
              <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                식단을 기록하면 운동량을 계산해드려요
              </p>
            </div>
            <ArrowUpRight
              aria-hidden="true"
              size={16}
              className="shrink-0 text-zinc-300 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 dark:text-zinc-600"
            />
          </div>
        ) : (
          <div className="grid w-full grid-cols-[88px_minmax(0,1fr)] items-center gap-3 min-[380px]:grid-cols-[104px_minmax(0,1fr)] min-[380px]:gap-5">
            {/* 원형 그래프 — 오늘 식단 초과분 대비 이미 태운 비율 */}
            <div className="relative shrink-0">
              <svg viewBox="0 0 100 100" className="h-[88px] w-[88px] -rotate-90 min-[380px]:h-[104px] min-[380px]:w-[104px]">
                <circle
                  cx="50"
                  cy="50"
                  r={R}
                  fill="none"
                  strokeWidth={10}
                  className="stroke-zinc-100 dark:stroke-zinc-800"
                />
                <circle
                  cx="50"
                  cy="50"
                  r={R}
                  fill="none"
                  strokeWidth={10}
                  strokeLinecap="round"
                  strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
                  className={
                    noExtraNeeded
                      ? "stroke-emerald-500"
                      : "stroke-emerald-500 transition-[stroke-dasharray] duration-500"
                  }
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {noExtraNeeded ? (
                  <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                    목표 이내
                  </span>
                ) : (
                  <>
                    <span className="text-xl font-black tabular-nums text-zinc-900 dark:text-zinc-50">
                      {need.remainingMinutes}
                    </span>
                    <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500">
                      분 더
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* 탄단지 — 더 먹어야 하는 양 */}
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500">
                탄단지 기준 더 먹을 수 있어요
              </p>
              <ul className="space-y-1.5">
                {MACRO_ROWS.map(({ key, label }) => (
                  <li
                    key={key}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="font-semibold text-zinc-600 dark:text-zinc-300">
                      {label}
                    </span>
                    <span className="font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
                      {macroRemaining[key]}g
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
