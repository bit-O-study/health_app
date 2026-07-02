import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Flag,
  Flame,
  Footprints,
  Utensils,
  Timer,
  Dumbbell,
  Wind,
} from "lucide-react";

import { getCurrentUser } from "@/lib/supabase/server";
import { getDayDetail } from "@/features/calendar/data-access";
import { getMyCommitments } from "@/features/commitments/data-access";
import { isActiveOn } from "@/features/commitments/commitment";
import { MEAL_LABEL, MEALS, type Meal } from "@/features/diet/meal";
import { ymdDisplay } from "@/features/routine/data";

export const dynamic = "force-dynamic";
export const metadata = { title: "기록 상세" };

function shortDuration(sec: number): string {
  if (sec <= 0) return "기록 없음";
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}분`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? `${h}시간` : `${h}시간 ${r}분`;
}

export default async function CalendarDayPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();

  const [
    { intake, burned, durationSec, steps, stepsKcal, foods, workouts, conditioning },
    allCommitments,
  ] = await Promise.all([getDayDetail(date), getMyCommitments()]);
  // 이 날짜에 진행 중인 다짐만.
  const dayCommitments = allCommitments.filter((c) =>
    isActiveOn({ startDate: c.startDate, deadline: c.deadline }, date),
  );
  const { weekday, label } = ymdDisplay(date);
  const [, mm] = label.split("/");
  void mm;

  const foodsByMeal = (meal: Meal) => foods.filter((f) => f.meal === meal);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
      <Link
        href="/calendar"
        className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-200"
      >
        <ChevronLeft aria-hidden="true" size={16} />
        캘린더
      </Link>

      <h1 className="mt-4 text-xl font-bold text-zinc-950 dark:text-zinc-50">
        {label} ({weekday})
      </h1>

      {/* 요약 칩 */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-3 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <span className="flex items-center justify-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
            <Utensils size={13} /> 섭취
          </span>
          <p className="mt-0.5 font-extrabold tabular-nums text-zinc-950 dark:text-zinc-50">
            +{intake}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-3 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <span className="flex items-center justify-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
            <Flame size={13} /> 소비
          </span>
          <p className="mt-0.5 font-extrabold tabular-nums text-zinc-950 dark:text-zinc-50">
            -{burned}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-3 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <span className="flex items-center justify-center gap-1 text-[11px] font-bold text-sky-600 dark:text-sky-400">
            <Footprints size={13} /> 걸음수
          </span>
          <p className="mt-0.5 font-extrabold tabular-nums text-zinc-950 dark:text-zinc-50">
            {steps.toLocaleString()}
          </p>
          <p className="text-[10px] font-medium text-zinc-400">
            {stepsKcal > 0 ? `-${stepsKcal}kcal` : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-3 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <span className="flex items-center justify-center gap-1 text-[11px] font-bold text-zinc-500 dark:text-zinc-400">
            <Timer size={13} /> 운동 시간
          </span>
          <p className="mt-0.5 font-extrabold tabular-nums text-zinc-950 dark:text-zinc-50">
            {shortDuration(durationSec)}
          </p>
        </div>
      </div>

      {/* 이 날짜에 진행 중인 다짐 — 클릭하면 다짐 관리로 이동 */}
      {dayCommitments.length > 0 ? (
        <section className="mt-6">
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-zinc-900 dark:text-zinc-100">
            <Flag size={16} className="text-emerald-600" /> 진행 중인 다짐
          </h2>
          <ul className="space-y-2">
            {dayCommitments.map((c) => {
              const p = c.progress;
              return (
                <li key={c.id}>
                  <Link
                    href="/commitments"
                    className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 transition hover:border-emerald-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-700"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                        {c.title}
                        {p.done ? (
                          <span className="ml-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            달성 ✓
                          </span>
                        ) : c.deadline === date ? (
                          <span className="ml-1 text-xs font-bold text-red-500">
                            오늘 데드라인
                          </span>
                        ) : null}
                      </p>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <div
                          className={`h-full rounded-full ${
                            p.done ? "bg-emerald-500" : "bg-emerald-400"
                          }`}
                          style={{ width: `${p.pct}%` }}
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                        {c.metricLabel} {p.current.toLocaleString()} /{" "}
                        {p.target.toLocaleString()} {c.unit}
                        {!p.done && !p.expired ? ` · D-${p.daysLeft}` : ""}
                      </p>
                    </div>
                    <ChevronRight
                      aria-hidden="true"
                      size={16}
                      className="shrink-0 text-zinc-400"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {/* 한 운동 */}
      <section className="mt-6">
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-zinc-900 dark:text-zinc-100">
          <Dumbbell size={16} className="text-emerald-600" /> 한 운동
        </h2>
        {workouts.length === 0 && conditioning.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 bg-white p-4 text-center text-sm text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900">
            완료한 운동이 없어요.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {workouts.map((w, i) => (
              <li key={`w${i}`} className="flex items-center justify-between gap-2 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                    {w.name}
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {w.sets}세트 × {w.reps}회
                    {w.weightKg != null ? ` · ${w.weightKg}kg` : " · 맨몸"}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  -{w.kcal}
                </span>
              </li>
            ))}
            {conditioning.map((c, i) => (
              <li key={`c${i}`} className="flex items-center justify-between gap-2 p-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1 truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                    <Wind size={13} className="shrink-0 text-sky-500" />
                    {c.name}
                  </p>
                  {c.detail ? (
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {c.detail}
                    </p>
                  ) : null}
                </div>
                <span className="shrink-0 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  -{c.kcal}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 식단 */}
      <section className="mt-6">
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-zinc-900 dark:text-zinc-100">
          <Utensils size={16} className="text-amber-600" /> 식단
        </h2>
        {foods.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 bg-white p-4 text-center text-sm text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900">
            기록한 식단이 없어요.
          </p>
        ) : (
          <div className="space-y-3">
            {MEALS.filter((m) => foodsByMeal(m).length > 0).map((meal) => (
              <div
                key={meal}
                className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="border-b border-zinc-100 px-3 py-1.5 text-xs font-bold text-zinc-600 dark:border-zinc-800 dark:text-zinc-300">
                  {MEAL_LABEL[meal]}
                </div>
                <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {foodsByMeal(meal).map((f) => (
                    <li key={f.id} className="flex items-center justify-between gap-2 p-3">
                      <span className="min-w-0 truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                        {f.name}
                        {f.amount ? (
                          <span className="ml-1 text-xs font-normal text-zinc-400">
                            {f.amount}
                          </span>
                        ) : null}
                      </span>
                      <span className="shrink-0 text-xs font-bold text-amber-600 dark:text-amber-400">
                        +{Math.round(f.kcal)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
