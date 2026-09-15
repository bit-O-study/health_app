import Link from "next/link";
import { Check, Target, UtensilsCrossed } from "lucide-react";

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
 * 홈 '오늘' 위젯 2칸 — 왼쪽 오늘의 다짐, 오른쪽 식단(작은 제목 + 큰 숫자, 촘촘하게).
 * 칸 전체가 링크라 누르면 원래 화면(다짐 / 식단)으로 간다.
 *
 * 서버 컴포넌트 — 숫자만 받아 그린다.
 */
export function TodayCard({
  commitments,
  need,
  macroRemaining,
  hasFoodLog,
}: {
  /** 예전 호출부 호환용(위젯에는 날짜를 따로 쓰지 않는다). */
  dateLabel?: string;
  commitments: TodayCommitment[];
  need: DietExerciseNeed;
  macroRemaining: MacroRemaining;
  hasFoodLog: boolean;
}) {
  const doneCount = commitments.filter((c) => c.done).length;

  return (
    <section data-testid="home-today" aria-label="오늘" className="grid grid-cols-2 gap-2">
      <Link
        href="/commitments"
        aria-label={`오늘의 다짐 ${commitments.length > 0 ? `${doneCount}/${commitments.length}` : "없음"}`}
        className="app-card app-press flex min-h-[6.5rem] flex-col px-3 py-2.5"
      >
        <span className="flex items-center gap-1 text-xs font-semibold text-[var(--info)]">
          <Target aria-hidden="true" size={13} />
          오늘의 다짐
        </span>
        {commitments.length === 0 ? (
          <>
            <span className="mt-auto text-xl font-bold text-zinc-900 dark:text-zinc-50">없음</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">다짐 만들기</span>
          </>
        ) : (
          <>
            <span className="text-xl font-bold tabular-nums text-zinc-900 dark:text-zinc-50">
              {doneCount}
              <span className="text-sm font-semibold text-zinc-400"> / {commitments.length}</span>
            </span>
            <ul className="mt-auto space-y-0.5">
              {commitments.slice(0, 2).map((c) => (
                <li key={c.id} className="flex min-w-0 items-center gap-1 text-xs">
                  <span
                    className={`flex h-3 w-3 shrink-0 items-center justify-center rounded-full border ${
                      c.done ? "border-[var(--info)] bg-[var(--info)] text-white" : "border-zinc-300 dark:border-zinc-600"
                    }`}
                  >
                    {c.done ? <Check aria-hidden="true" size={8} strokeWidth={3} /> : null}
                  </span>
                  <span className={`truncate ${c.done ? "text-zinc-400 line-through" : "text-zinc-700 dark:text-zinc-300"}`}>
                    {c.title}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Link>

      <Link
        href="/diet"
        aria-label={hasFoodLog ? "식단" : "오늘 식단 기록이 없어요"}
        className="app-card app-press flex min-h-[6.5rem] flex-col px-3 py-2.5"
      >
        <span className="flex items-center gap-1 text-xs font-semibold text-warn">
          <UtensilsCrossed aria-hidden="true" size={13} />
          식단
        </span>
        {!hasFoodLog ? (
          <>
            <span className="mt-auto text-sm font-bold leading-tight text-zinc-900 dark:text-zinc-50">
              오늘 식단 기록이 없어요
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">기록하기</span>
          </>
        ) : (
          <>
            <span className="text-xl font-bold leading-7 text-zinc-900 dark:text-zinc-50">
              {need.neededKcal === 0 ? "목표 이내" : `${need.remainingMinutes}분 더`}
            </span>
            <span className="mt-auto flex flex-wrap gap-x-1.5 text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
              {MACROS.map(({ key, label }) => (
                <span key={key}>
                  {label} <span className="font-semibold text-zinc-900 dark:text-zinc-100">{macroRemaining[key]}g</span>
                </span>
              ))}
            </span>
          </>
        )}
      </Link>
    </section>
  );
}
