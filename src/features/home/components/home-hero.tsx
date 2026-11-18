import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";

import type { HeroStats } from "@/features/home/hero-stats";
import type { TodayCommitment } from "@/features/home/home-data";

/**
 * 홈 주인공 — 오늘 할 일 한 가지를 크게(2026-11-18 리디자인).
 * 진행 링 + 행동 버튼 + 숫자 3칸을 한 장에 모은다. 서버 컴포넌트, 숫자만 받아 그린다.
 */
export function HomeHero({
  dateLabel,
  stats,
  commitDone,
  commitTotal,
  workoutCount,
}: {
  dateLabel: string;
  stats: HeroStats;
  commitDone: number;
  commitTotal: number;
  workoutCount: number;
}) {
  const useCommit = commitTotal > 0;
  const ratio = useCommit ? commitDone / commitTotal : stats.weekCount / 7;
  const R = 31;
  const C = 2 * Math.PI * R;
  const title = stats.todayDone ? "오늘 운동을 마쳤어요" : "오늘 운동 시작하기";
  const sub = stats.streak > 0 ? `${stats.streak}일 연속 운동 중` : "첫 기록을 남겨 보세요";
  return (
    <section aria-label="오늘" className="app-focus">
      <p className="text-xs font-medium text-muted">{dateLabel}</p>
      <div className="mt-2 flex items-center gap-4">
        <div className="relative h-[84px] w-[84px] shrink-0">
          <svg viewBox="0 0 76 76" className="h-full w-full -rotate-90" aria-hidden="true">
            <circle cx="38" cy="38" r={R} fill="none" strokeWidth="8" className="stroke-zinc-200 dark:stroke-zinc-800" />
            <circle
              cx="38"
              cy="38"
              r={R}
              fill="none"
              strokeWidth="8"
              strokeLinecap="round"
              className="stroke-brand transition-[stroke-dashoffset]"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - Math.min(1, Math.max(0, ratio)))}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="app-num text-lg">{useCommit ? `${commitDone}/${commitTotal}` : `${stats.weekCount}/7`}</span>
          </div>
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold leading-tight tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted">{sub}</p>
          <p className="mt-0.5 text-xs text-muted">{useCommit ? "오늘의 다짐 진행" : "이번 주 운동한 날"}</p>
        </div>
      </div>
      <Link
        href="/routine"
        className="mt-4 flex min-h-12 items-center justify-center gap-1 rounded-2xl bg-brand text-base font-bold text-white transition active:opacity-90 dark:text-zinc-950"
      >
        {stats.todayDone ? "오늘 기록 보기" : "운동 하러 가기"}
        <ChevronRight aria-hidden="true" size={18} />
      </Link>
      <dl className="mt-4 grid grid-cols-3 border-t border-line pt-4">
        {[
          { label: "연속", value: stats.streak, unit: "일" },
          { label: "이번 주", value: stats.weekCount, unit: "회" },
          { label: "누적", value: workoutCount, unit: "일" },
        ].map((m, i) => (
          <div key={m.label} className={i > 0 ? "border-l border-line pl-4" : ""}>
            <dd className="app-num text-2xl">
              {m.value.toLocaleString()}
              <span className="ml-0.5 text-sm font-medium text-muted">{m.unit}</span>
            </dd>
            <dt className="mt-0.5 text-xs text-muted">{m.label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** 이번 주 7칸 — 운동한 날은 채우고, 오늘은 테두리, 미래는 흐리게. */
export function HomeWeekStrip({ stats }: { stats: HeroStats }) {
  if (stats.week.length === 0) return null;
  return (
    <section aria-label="이번 주">
      <div className="app-section-head">
        <h2>이번 주</h2>
        <Link href="/calendar" className="inline-flex min-h-11 items-center text-sm font-medium text-brand">
          달력
        </Link>
      </div>
      <ol className="grid grid-cols-7 gap-1 text-center">
        {stats.week.map((d) => (
          <li key={d.date} className="flex flex-col items-center gap-1.5">
            <span className={`text-xs ${d.isToday ? "font-bold text-foreground" : "text-muted"}`}>{d.label}</span>
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-full border text-white dark:text-zinc-950 ${
                d.done
                  ? "border-brand bg-brand"
                  : d.isToday
                    ? "border-brand"
                    : d.isFuture
                      ? "border-dashed border-line"
                      : "border-line"
              }`}
            >
              {d.done ? <Check aria-hidden="true" size={16} strokeWidth={3} /> : null}
              <span className="sr-only">{d.done ? "운동함" : d.isFuture ? "예정" : "쉼"}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** 오늘의 다짐 — 카드 안의 카드 없이 하나의 묶음 목록. */
export function HomeCommitments({ commitments }: { commitments: TodayCommitment[] }) {
  const done = commitments.filter((c) => c.done).length;
  return (
    <section aria-label="오늘의 다짐">
      <Link href="/commitments" className="app-section-head min-h-11 items-center">
        <h2>
          오늘의 다짐
          {commitments.length > 0 ? (
            <span className="app-num ml-2 text-sm text-brand">
              {done}/{commitments.length}
            </span>
          ) : null}
        </h2>
        <span className="inline-flex items-center text-sm font-medium text-brand">
          전체
          <ChevronRight aria-hidden="true" size={16} />
        </span>
      </Link>
      {commitments.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">
          오늘 진행 중인 다짐이 없어요.
          <br />
          작은 목표부터 만들어 보세요.
        </p>
      ) : (
        <ul className="app-list">
          {commitments.map((c) => (
            <li key={c.id}>
              <Link href="/commitments" className="flex min-h-12 items-center gap-3 px-4 py-2.5 transition active:bg-black/5 dark:active:bg-white/5">
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                    c.done ? "border-brand bg-brand text-white dark:text-zinc-950" : "border-muted"
                  }`}
                >
                  {c.done ? <Check aria-hidden="true" size={12} strokeWidth={3} /> : null}
                </span>
                <span className={`text-safe min-w-0 flex-1 text-sm ${c.done ? "text-muted line-through" : "font-semibold"}`}>
                  {c.title}
                </span>
                <span className="max-w-24 shrink-0 truncate text-xs tabular-nums text-muted">{c.valueText}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
