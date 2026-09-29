import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, Dumbbell, Footprints, Utensils, Wind } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/supabase/server";
import { getDayDetail } from "@/features/calendar/data-access";
import { getMyCommitments } from "@/features/commitments/data-access";
import { isActiveOn } from "@/features/commitments/commitment";
import { MEAL_LABEL, MEALS, type Meal } from "@/features/diet/meal";
import { seoulYmd, ymdDisplay } from "@/features/routine/data";
import { formatWater } from "@/features/diet/water";
import {
  adjacentDays,
  distanceLabel,
  durationLabel,
  paceLabel,
} from "@/features/calendar/calendar-labels";

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
    {
      intake,
      burned,
      durationSec,
      steps,
      stepsKcal,
      runs,
      waterMl,
      weighedKg,
      macros,
      foods,
      workouts,
      conditioning,
    },
    allCommitments,
  ] = await Promise.all([getDayDetail(date), getMyCommitments()]);
  // 이 날짜에 진행 중인 다짐만.
  const dayCommitments = allCommitments.filter((c) =>
    isActiveOn({ startDate: c.startDate, deadline: c.deadline }, date),
  );
  const { weekday, label } = ymdDisplay(date);
  const today = seoulYmd();
  const { prev, next } = adjacentDays(date);
  const hasMacros = macros.protein + macros.carbs + macros.fat > 0;

  const foodsByMeal = (meal: Meal) => foods.filter((f) => f.meal === meal);

  const empty = (text: string) => (
    <p className="app-card p-3 text-center text-sm text-zinc-400">{text}</p>
  );

  // 공통 머리글 + 섹션 라벨 + 그룹 목록(2026-09-16 8단계). 요약 카드 4장 → 한 장 네 칸.
  return (
    <div className="app-page">
      <PageHeader title={`${label} (${weekday})`} back="캘린더" backHref="/calendar">
        {/* 앞뒤 날짜 — 한 날을 보고 달력으로 돌아가지 않아도 옆 날로(2단계). */}
        <Link
          href={`/calendar/${prev}`}
          aria-label="전날"
          className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition active:bg-zinc-100 dark:text-zinc-400 dark:active:bg-white/[0.06]"
        >
          <ChevronLeft aria-hidden="true" size={20} />
        </Link>
        <Link
          href={`/calendar/${next}`}
          aria-label="다음날"
          className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition active:bg-zinc-100 dark:text-zinc-400 dark:active:bg-white/[0.06]"
        >
          <ChevronRight aria-hidden="true" size={20} />
        </Link>
      </PageHeader>
      <main className="app-container space-y-4">
        {/* 요약 — 섭취·소비·걸음수·운동 시간 네 칸 */}
        <div className="app-list">
        <div className="grid grid-cols-4 divide-x divide-[var(--line)] py-2.5">
          <DayStat label="섭취" value={`+${intake}`} />
          <DayStat label="소비" value={`-${burned}`} tone="text-brand" />
          <DayStat
            label="걸음수"
            value={steps.toLocaleString()}
            sub={stepsKcal > 0 ? `-${stepsKcal}kcal` : undefined}
          />
          <DayStat label="운동 시간" value={shortDuration(durationSec)} />
        </div>
        {/* 물·체중·영양소 — 기록이 있을 때만 한 줄씩(없는 값으로 칸을 채우지 않는다). */}
        {waterMl > 0 || weighedKg !== null || hasMacros ? (
          <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-[var(--line)] px-4 py-2.5 text-xs text-zinc-500 dark:text-zinc-400" data-testid="day-extras">
            {waterMl > 0 ? <span>물 <b className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{formatWater(waterMl)}</b></span> : null}
            {weighedKg !== null ? <span>체중 <b className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{weighedKg}kg</b></span> : null}
            {hasMacros ? (
              <span>
                단백질 <b className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{macros.protein}g</b>
                {" · "}탄수 <b className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{macros.carbs}g</b>
                {" · "}지방 <b className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{macros.fat}g</b>
              </span>
            ) : null}
          </div>
        ) : null}
        </div>

        {/* 바로가기 — 보던 날짜로 식단을 적고, 오늘이면 운동하러. 막다른 화면이 되지 않게(2단계). */}
        <div className="flex gap-2" data-testid="day-actions">
          <Link
            href={`/diet?d=${date}`}
            className="app-press inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-zinc-100 text-sm font-semibold text-zinc-800 dark:bg-white/[0.08] dark:text-zinc-100"
          >
            <Utensils aria-hidden="true" size={15} />
            이날 식단 기록
          </Link>
          {date === today ? (
            <Link
              href="/routine"
              className="app-press inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand text-sm font-semibold text-white dark:text-zinc-950"
            >
              <Dumbbell aria-hidden="true" size={15} />
              오늘 운동하기
            </Link>
          ) : null}
        </div>

        {/* 런닝 — 거리·시간·페이스. 칼로리는 아래 '한 운동'(컨디셔닝)에 이미 들어 있다. */}
        {runs.length > 0 ? (
          <section>
            <h2 className="app-section-label">런닝</h2>
            <ul className="app-list" data-testid="day-runs">
              {runs.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/routine/running-records/${r.id}`}
                    className="app-row justify-between py-2 transition active:bg-zinc-100 dark:active:bg-white/[0.06]"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Footprints aria-hidden="true" size={15} className="shrink-0" style={{ color: "var(--info)" }} />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                          {distanceLabel(r.distanceM)}
                        </span>
                        <span className="block text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                          {durationLabel(r.durationSec)} · 평균 {paceLabel(r.paceSecPerKm)}
                        </span>
                      </span>
                    </span>
                    <ChevronRight aria-hidden="true" size={16} className="shrink-0 text-zinc-400" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* 이 날짜에 진행 중인 다짐 — 누르면 다짐 관리로 이동 */}
        {dayCommitments.length > 0 ? (
          <section>
            <h2 className="app-section-label">진행 중인 다짐</h2>
            <ul className="app-list">
              {dayCommitments.map((c) => {
                const p = c.progress;
                return (
                  <li key={c.id}>
                    <Link
                      href="/commitments"
                      className="app-row py-2 transition active:bg-zinc-100 dark:active:bg-white/[0.06]"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {c.title}
                          {p.done ? (
                            <span className="ml-1 text-xs font-semibold text-brand">달성 ✓</span>
                          ) : c.deadline === date ? (
                            <span className="ml-1 text-xs font-semibold text-danger">오늘 데드라인</span>
                          ) : null}
                        </span>
                        <span className="mt-1 block h-1 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-white/[0.08]">
                          <span
                            className={`block h-full rounded-full ${p.done ? "bg-brand" : "bg-brand/60"}`}
                            style={{ width: `${p.pct}%` }}
                          />
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-zinc-500 dark:text-zinc-400">
                          {c.metricLabel} {p.current.toLocaleString()} / {p.target.toLocaleString()} {c.unit}
                          {!p.done && !p.expired ? ` · D-${p.daysLeft}` : ""}
                        </span>
                      </span>
                      <ChevronRight aria-hidden="true" size={16} className="shrink-0 text-zinc-400" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {/* 한 운동 */}
        <section>
          <h2 className="app-section-label">한 운동</h2>
          {workouts.length === 0 && conditioning.length === 0 ? (
            empty("완료한 운동이 없어요.")
          ) : (
            <ul className="app-list">
              {workouts.map((w, i) => (
                <li key={`w${i}`} className="app-row justify-between py-1.5">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {w.name}
                    </span>
                    <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                      {w.sets}세트 × {w.reps}회
                      {w.weightKg != null ? ` · ${w.weightKg}kg` : " · 맨몸"}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm tabular-nums text-brand">-{w.kcal}</span>
                </li>
              ))}
              {conditioning.map((c, i) => (
                <li key={`c${i}`} className="app-row justify-between py-1.5">
                  <span className="min-w-0">
                    <span className="flex items-center gap-1 truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      <Wind aria-hidden="true" size={13} className="shrink-0 text-zinc-400" />
                      {c.name}
                    </span>
                    {c.detail ? (
                      <span className="block text-xs text-zinc-500 dark:text-zinc-400">{c.detail}</span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-sm tabular-nums text-brand">-{c.kcal}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 식단 — 끼니마다 "식단 · 아침" 라벨 한 줄 + 목록 한 장.
            (라벨 두 줄을 겹쳐 두면 "식단/아침" 이 한 덩어리로 찌그러져 보였다 — 2026-09-16 캡처) */}
        <section className="space-y-3">
          {foods.length === 0 ? (
            <div>
              <h2 className="app-section-label">식단</h2>
              {empty("기록한 식단이 없어요.")}
            </div>
          ) : (
            MEALS.filter((m) => foodsByMeal(m).length > 0).map((meal) => (
                <div key={meal}>
                  <h2 className="app-section-label">식단 · {MEAL_LABEL[meal]}</h2>
                  <ul className="app-list">
                    {foodsByMeal(meal).map((f) => (
                      <li key={f.id} className="app-row min-h-[2.75rem] justify-between">
                        <span className="min-w-0 truncate text-sm text-zinc-900 dark:text-zinc-100">
                          {f.name}
                          {f.amount ? (
                            <span className="ml-1 text-xs text-zinc-400">{f.amount}</span>
                          ) : null}
                        </span>
                        <span className="shrink-0 text-sm tabular-nums text-zinc-500 dark:text-zinc-400">
                          +{Math.round(f.kcal)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
          )}
        </section>
      </main>
    </div>
  );
}

/** 요약 한 칸 — 라벨 위, 값 아래. */
function DayStat({
  label,
  value,
  sub,
  tone = "text-zinc-950 dark:text-zinc-50",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: string;
}) {
  return (
    <div className="min-w-0 px-1 text-center">
      <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className={`mt-0.5 truncate text-sm font-semibold tabular-nums ${tone}`}>{value}</p>
      {sub ? <p className="truncate text-xs tabular-nums text-zinc-400">{sub}</p> : null}
    </div>
  );
}
