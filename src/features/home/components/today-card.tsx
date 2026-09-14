import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";

import type {
  DietExerciseNeed,
  MacroRemaining,
} from "@/features/home/dashboard-metrics";
import type { TodayCommitment } from "@/features/home/home-data";

const MACROS: { key: keyof MacroRemaining; label: string }[] = [
  { key: "carbs", label: "탄수" },
  { key: "protein", label: "단백질" },
  { key: "fat", label: "지방" },
];

/**
 * 홈 '오늘' 카드 — 오늘의 다짐 + 식단 기준 운동량을 **한 장**에.
 *
 * 예전엔 다짐 카드와 원형 그래프 식단 카드가 따로 떠서, 둘 다 "오늘 뭘 해야 하나"를
 * 말하는데 홈 블록만 늘렸다. 한 카드 안에서 줄로 나누고, 각 줄을 누르면
 * 원래 화면(다짐 / 식단)으로 간다.
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
        className="flex items-baseline gap-2 px-4 pt-4 text-base font-semibold text-zinc-900 dark:text-zinc-100"
      >
        오늘
        <span className="text-sm font-normal text-zinc-500 dark:text-zinc-400">
          {dateLabel}
        </span>
      </h2>

      <Link href="/commitments" className="block px-4 pb-3 pt-2">
        <span className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
          오늘의 다짐
          {commitments.length > 0 ? (
            <span className="tabular-nums">
              {doneCount}/{commitments.length}
            </span>
          ) : null}
          <ChevronRight
            aria-hidden="true"
            size={16}
            className="ml-auto shrink-0 text-zinc-400"
          />
        </span>
        {commitments.length === 0 ? (
          <span className="mt-1.5 block text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            진행 중인 다짐이 없어요. 작은 목표부터 만들어 보세요.
          </span>
        ) : (
          <ul className="mt-2 space-y-2">
            {commitments.map((c) => (
              <li key={c.id} className="flex min-w-0 items-center gap-2.5">
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                    c.done
                      ? "border-brand bg-brand text-white"
                      : "border-zinc-300 dark:border-zinc-600"
                  }`}
                >
                  {c.done ? (
                    <Check aria-hidden="true" size={10} strokeWidth={3} />
                  ) : null}
                </span>
                <span
                  className={`text-safe min-w-0 flex-1 text-sm leading-5 ${
                    c.done
                      ? "text-zinc-400 line-through dark:text-zinc-500"
                      : "text-zinc-800 dark:text-zinc-200"
                  }`}
                >
                  {c.title}
                </span>
                <span className="max-w-24 shrink-0 truncate text-xs tabular-nums text-zinc-400 dark:text-zinc-500">
                  {c.valueText}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Link>

      <div className="mx-4 border-t border-[var(--line)]" />

      <Link href="/diet" className="block px-4 pb-4 pt-3">
        {!hasFoodLog ? (
          <span className="flex items-center gap-2">
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                오늘 식단 기록이 없어요
              </span>
              <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                식단을 기록하면 필요한 운동량을 계산해 드려요
              </span>
            </span>
            <ChevronRight
              aria-hidden="true"
              size={16}
              className="shrink-0 text-zinc-400"
            />
          </span>
        ) : (
          <>
            <span className="flex items-center gap-2 text-sm">
              <span className="text-zinc-500 dark:text-zinc-400">
                식단 기준 추가 운동
              </span>
              <span className="ml-auto font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                {need.neededKcal === 0
                  ? "목표 이내"
                  : `${need.remainingMinutes}분 더`}
              </span>
              <ChevronRight
                aria-hidden="true"
                size={16}
                className="shrink-0 text-zinc-400"
              />
            </span>
            <span className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-zinc-500 dark:text-zinc-400">
              더 먹어도 되는 양
              {MACROS.map(({ key, label }) => (
                <span key={key} className="tabular-nums">
                  {label}{" "}
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {macroRemaining[key]}g
                  </span>
                </span>
              ))}
            </span>
          </>
        )}
      </Link>
    </section>
  );
}
