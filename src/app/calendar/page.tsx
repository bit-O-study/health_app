import { calendarWeek } from "@/features/launcher/calendar-range";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Flame,
  Footprints,
  Heart,
  History,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/supabase/server";
import { getUserProfile } from "@/features/profile/data-access";
import { seoulYmd } from "@/features/routine/data";
import { getCurrentStreak, getMonthlyCalendar } from "@/features/calendar/data-access";
import {
  activityLevel,
  plannedLabel,
  type RoutineCycle,
} from "@/features/calendar/month-stats";
import { ShareMonthImage } from "@/features/calendar/components/share-month-image";
import { getUserRoutine } from "@/features/routine/data-access";
import { resolveRoutine } from "@/features/routine/data";
import {
  calorieBalance,
  dayAriaLabel,
  directionLabel,
  signedKcal,
  type CalorieBalance,
} from "@/features/calendar/calorie-balance";
import { distanceLabel, summaryTitle, weekTitle } from "@/features/calendar/calendar-labels";
import type { DaySummary } from "@/features/calendar/data-access";
import { getMissionCalendar } from "@/features/commitments/data-access";
import { MARKER_SYMBOL } from "@/features/commitments/missions";
import { getLatestWeights } from "@/features/profile/body-logs";
import {
  computeWeightDelta,
  latestWeightAt,
} from "@/features/profile/weight-delta";
import { shortDateLabel } from "@/features/profile/body-chart-data";
import { StepsSync } from "@/features/health/components/steps-sync";
import { CommitmentSuggestions } from "@/features/coach/components/commitment-suggestions";
import { isDebugFeatureEnabled } from "@/features/admin/debug-features.server";
import { isAiFeatureEnabled } from "@/features/coach/ai-access.server";
import { getDayMarks, isHoliday } from "@/features/calendar/holidays";
import { getCycleLogsRange, getPeriodStartDates } from "@/features/cycle/data-access";
import {
  predictCycle,
  predictedPeriodDatesInRange,
} from "@/features/cycle/cycle-predict";

export const dynamic = "force-dynamic";
export const metadata = { title: "캘린더" };

const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"] as const;
const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (y: number, m1: number, d: number) => `${y}-${pad(m1)}-${pad(d)}`;
const daysInMonth = (y: number, m0: number) =>
  new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate();
function parseMonth(s: string | undefined) {
  if (s && /^\d{4}-\d{2}$/.test(s)) {
    const [y, m] = s.split("-").map(Number);
    if (m >= 1 && m <= 12) return { year: y, month0: m - 1 };
  }
  const [yy, mm] = seoulYmd().split("-").map(Number);
  return { year: yy, month0: mm - 1 };
}
function shiftMonth(y: number, m0: number, delta: number) {
  const d = new Date(Date.UTC(y, m0 + delta, 1));
  return { year: d.getUTCFullYear(), month0: d.getUTCMonth() };
}
const leadDays = (jsDay: number) => (jsDay === 0 ? 6 : jsDay - 1);

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string; view?: string; d?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { m, view, d } = await searchParams;
  const today = seoulYmd();
  // 예전 view=goals·view=stats 는 들어가는 링크가 없는 죽은 화면이라 뺐다(2026-09-29 캘린더 1단계).
  const isWeek = view === "week";
  const week = calendarWeek(d, today);
  const { year, month0 } = parseMonth(m);
  const dim = daysInMonth(year, month0);
  const from = isWeek ? week.from : ymd(year, month0 + 1, 1);
  const to = isWeek ? week.to : ymd(year, month0 + 1, dim);
  const prev = shiftMonth(year, month0, -1);
  const next = shiftMonth(year, month0, +1);
  const monthParam = (mm: { year: number; month0: number }) =>
    `${mm.year}-${pad(mm.month0 + 1)}`;
  // 서로 독립인 쿼리는 한 번에(직렬 → 1파). 각 함수는 cache()된 인증을 공유.
  // ⚡ 생리 기록도 첫 묶음에 — 성별(프로필)을 알고 나서 따로 조회하면 왕복이 한 번 더 쌓인다.
  //   남성은 결과를 안 쓴다(작은 조회 두 개라 기다리는 왕복보다 싸다). (캘린더 속도 정리)
  const [
    { byDate, intakeTotal, workoutBurnedTotal, stepsBurnedTotal, bmr },
    bodyLogs,
    profile,
    debug,
    coachEnabled,
    missionMarks,
    routine,
    streak,
    cycleLogs,
    periodStartDates,
  ] = await Promise.all([
    getMonthlyCalendar(from, to),
    getLatestWeights(),
    getUserProfile(),
    isDebugFeatureEnabled("steps"),
    isAiFeatureEnabled("helssu-coach"),
    getMissionCalendar(from, to),
    getUserRoutine(),
    // 연속 운동 일수 — 60일씩 필요한 만큼만(1년치 한 번에 → 1,000행 잘림).
    getCurrentStreak(today),
    getCycleLogsRange(from, to),
    getPeriodStartDates(),
  ]);
  // 앞으로 할 루틴(읽기 전용). 루틴이 없으면 예정 표시를 안 한다.
  const cycle: RoutineCycle | null = routine
    ? {
        startDate: routine.startDate,
        variantId: routine.variantId,
        customWeek: routine.customWeek,
        week: resolveRoutine(routine.splits, routine.variantId, routine.customWeek).variant.week,
      }
    : null;
  const planFor = (date: string) => (cycle && date > today ? plannedLabel(cycle, date) : null);
  // 칸 색 진하기 기준 — 이 기간에서 운동 kcal 이 가장 많은 날.
  const maxExerciseKcal = Math.max(0, ...[...byDate.values()].map((v) => v.exerciseKcal));
  // 칼로리 수지 — 식단 기록한 날만, 기초대사량까지 넣어서(예전엔 빠져 늘 '적자' 였다).
  const balance = calorieBalance(byDate.values(), bmr);

  // 체중 증감 — 직전 기록 대비. 기록 없으면 null(→ '체형 기록하러 가기' 버튼).
  const weightDelta = computeWeightDelta(bodyLogs.map((l) => l.weightKg));
  const weightMeasuredAt = latestWeightAt(bodyLogs);
  const periodDays = new Set<string>();
  const predictedDays = new Set<string>();
  if (profile?.gender === "female") {
    for (const l of cycleLogs) if (l.isPeriod) periodDays.add(l.forDate);
    const pred = predictCycle(periodStartDates, today);
    for (const d of predictedPeriodDatesInRange(pred, from, to)) {
      if (!periodDays.has(d)) predictedDays.add(d);
    }
  }

  // 셀 구성(월요일 시작)
  const firstJsDay = new Date(Date.UTC(year, month0, 1)).getUTCDay();
  const lead = isWeek ? 0 : leadDays(firstJsDay);
  const cells: (number | null)[] = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let day = 1; day <= (isWeek ? 7 : dim); day++) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="app-page">
    {/* 달 이동은 큰 제목 줄 오른쪽으로 — 따로 한 줄을 쓰지 않는다(2026-09-16 촘촘하게). */}
    <PageHeader branded title="캘린더">
      <Link
        href={isWeek ? `/calendar/week?d=${week.previous}` : `/calendar?m=${monthParam(prev)}`}
        aria-label={isWeek ? "이전 주" : "이전 달"}
        className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition active:bg-zinc-100 dark:text-zinc-400 dark:active:bg-white/[0.06]"
      >
        <ChevronLeft aria-hidden="true" size={18} />
      </Link>
      <h2 className="min-w-[5.5rem] text-center text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
        {isWeek ? weekTitle(week.from, week.to) : `${year}년 ${month0 + 1}월`}
      </h2>
      <Link
        href={isWeek ? `/calendar/week?d=${week.next}` : `/calendar?m=${monthParam(next)}`}
        aria-label={isWeek ? "다음 주" : "다음 달"}
        className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition active:bg-zinc-100 dark:text-zinc-400 dark:active:bg-white/[0.06]"
      >
        <ChevronRight aria-hidden="true" size={18} />
      </Link>
    </PageHeader>
    <main className="app-container space-y-5">
      {/* 연속 운동 일수(왼쪽) · 운동 기록 화면 · 생리 기록(여성) · 걸음수 동기화 */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        {streak > 0 ? (
          <span
            data-testid="calendar-streak"
            className="mr-auto inline-flex h-7 items-center gap-1 rounded-full bg-brand-soft px-2.5 text-xs font-bold text-brand"
          >
            <Flame aria-hidden="true" size={13} />
            {streak}일 연속 운동
          </span>
        ) : null}
        {/* 운동 기록(부위별 달력)과 서로 오간다 — 두 달력을 합치는 대신 연결(3단계). */}
        <Link
          href={`/settings/history?month=${isWeek ? week.from.slice(0, 7) : monthParam({ year, month0 })}`}
          className="app-press inline-flex h-7 items-center gap-1 rounded-full bg-zinc-100 px-2.5 text-xs font-semibold text-zinc-700 dark:bg-white/[0.08] dark:text-zinc-200"
        >
          <History aria-hidden="true" size={12} />
          운동 기록
        </Link>
        {profile?.gender === "female" ? (
          <Link
            href="/cycle"
            className="app-press inline-flex h-7 items-center gap-1 rounded-full bg-zinc-100 px-2.5 text-xs font-semibold text-zinc-700 dark:bg-white/[0.08] dark:text-zinc-200"
          >
            <Heart aria-hidden="true" size={12} />
            생리 기록
          </Link>
        ) : null}
        <StepsSync debug={debug} />
      </div>

      {/* 주간 — 월간 칸을 줄여 쓰면 빈 공간만 커서, 요일마다 한 줄 + 막대로 그린다(2단계). */}
      {isWeek ? (
        <div className="app-card px-3 py-3">
          <WeekList
            dates={week.dates}
            today={today}
            byDate={byDate}
            missionMarks={missionMarks}
            periodDays={periodDays}
            predictedDays={predictedDays}
            planFor={planFor}
          />
          <CalendarLegend showCycle={profile?.gender === "female"} />
        </div>
      ) : null}

      {/* 캘린더 — 칸 높이 52px(날짜 + 섭취/소비 두 줄이 딱 들어가는 높이). 주간일 땐 위 목록이 대신한다. */}
      {isWeek ? null : (
      <div className="app-card px-2 py-4">
        <div className="grid grid-cols-7">
          {WEEKDAYS.map((w, i) => (
            <div
              key={w}
              className={`pb-1 text-center text-xs ${
                i === 6 ? "text-danger" : "text-zinc-400 dark:text-zinc-500"
              }`}
            >
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day, idx) => {
            if (day === null) return <div key={`e${idx}`} />;
            const date = isWeek ? week.dates[idx] : ymd(year, month0 + 1, day);
            const s = byDate.get(date);
            const isToday = date === today;
            const marks = getDayMarks(date);
            const holiday = marks.find((mk) => mk.kind === "holiday");
            const bok = marks.find((mk) => mk.kind === "bok");
            const isHol = isHoliday(date);
            const col = idx % 7;
            const isPeriod = periodDays.has(date);
            const isPredicted = predictedDays.has(date);
            const mMark = missionMarks[date];
            const plan = s ? null : planFor(date);
            const level = activityLevel(s?.exerciseKcal ?? 0, maxExerciseKcal);
            // 일요일·공휴일만 빨강. 토요일 파랑은 뺐다(색을 줄여 날짜 기록이 먼저 보이게).
            const dayColor = isHol || col === 6
              ? "text-danger"
              : "text-zinc-800 dark:text-zinc-200";
            return (
              <Link
                key={date}
                href={`/calendar/${date}`}
                aria-label={dayAriaLabel({
                  date,
                  isToday,
                  holiday: holiday?.name ?? null,
                  intake: s?.intake ?? 0,
                  burned: s?.burned ?? 0,
                  didWeight: !!s?.didWeight,
                  missionPct: mMark ? mMark.pct : null,
                  period: isPeriod ? "period" : isPredicted ? "predicted" : null,
                  runM: s?.runM ?? 0,
                  weighedKg: s?.weighedKg ?? null,
                })}
                aria-current={isToday ? "date" : undefined}
                data-level={level}
                className={`relative flex min-h-[3.25rem] flex-col items-center rounded-lg px-0.5 py-0.5 transition active:bg-zinc-100 dark:active:bg-white/[0.06] ${LEVEL_BG[level]}`}
              >
                {(isPeriod || isPredicted) && (
                  <Heart
                    aria-label="생리"
                    className={`absolute right-0.5 top-0.5 ${
                      isPeriod
                        ? "fill-rose-500 text-rose-500"
                        : "text-rose-300 dark:text-rose-700"
                    }`}
                    size={9}
                  />
                )}
                {typeof s?.weighedKg === "number" ? (
                  <span
                    aria-label="체중 잰 날"
                    className="absolute bottom-1 left-1 h-1.5 w-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500"
                  />
                ) : null}
                {s?.didWeight ? (
                  <Dumbbell
                    aria-label="웨이트한 날"
                    className="absolute bottom-0.5 right-0.5 text-brand"
                    size={10}
                  />
                ) : null}
                {mMark ? (
                  <span
                    aria-label={`미션 달성 ${mMark.pct}%`}
                    className={`absolute left-0.5 top-0.5 text-xs font-bold leading-none ${
                      mMark.marker === "circle"
                        ? "text-brand"
                        : mMark.marker === "triangle"
                          ? "text-amber-500"
                          : "text-rose-400"
                    }`}
                  >
                    {MARKER_SYMBOL[mMark.marker]}
                  </span>
                ) : null}
                {/* 오늘은 아이폰 달력처럼 브랜드색 동그라미 안에 숫자. */}
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums ${
                    isToday ? "bg-brand text-white dark:text-zinc-950" : dayColor
                  }`}
                >
                  {isWeek ? Number(date.slice(8)) : day}
                </span>
                {holiday ? (
                  <span className="w-full truncate text-center text-xs leading-4 text-danger">
                    {holiday.name}
                  </span>
                ) : bok ? (
                  <span className="w-full truncate text-center text-xs leading-4 text-zinc-500 dark:text-zinc-400">
                    {bok.name}
                  </span>
                ) : null}
                {s && s.intake > 0 ? (
                  <span className="text-xs leading-4 tabular-nums text-zinc-500 dark:text-zinc-400">
                    +{s.intake}
                  </span>
                ) : null}
                {s && s.burned > 0 ? (
                  <span className="text-xs leading-4 tabular-nums text-brand">
                    -{s.burned}
                  </span>
                ) : null}
                {s && s.runM > 0 ? (
                  <span className="text-xs font-semibold leading-4 tabular-nums" style={{ color: "var(--info)" }}>
                    {distanceLabel(s.runM)}
                  </span>
                ) : null}
                {plan?.label ? (
                  <span data-testid="planned" className="w-full truncate text-center text-xs leading-4 text-zinc-400 dark:text-zinc-500">
                    {plan.label}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
        <CalendarLegend showCycle={profile?.gender === "female"} />
      </div>
      )}

      {/* 월 요약 — 카드 4장을 한 장으로: 섭취·소비·수지 세 칸 + 체중 한 줄 */}
      <section>
        <h2 className="app-section-label">
          {summaryTitle(isWeek ? { kind: "week", from: week.from } : { kind: "month", year, month1: month0 + 1 }, today)}
        </h2>
        <div className="app-list">
          <div className="grid grid-cols-3 divide-x divide-[var(--line)] py-2.5">
            <SummaryStat label="총 섭취" value={intakeTotal} />
            <SummaryStat label="운동 소비" value={workoutBurnedTotal} />
            <BalanceStat balance={balance} />
          </div>
          <BalanceNote balance={balance} stepsTotal={stepsBurnedTotal} bmrPerDay={bmr} />
          <div>
            <WeightRow delta={weightDelta} measuredAt={weightMeasuredAt} />
          </div>
        </div>
      </section>

      {/* 이달 기록 이미지 — 운동한 날·연속·런닝을 한 장으로(3단계). 월간에서만. */}
      {isWeek ? null : <ShareMonthImage month={monthParam({ year, month0 })} />}

      {/* AI 다짐 짜주기 — 디버그 계정(짐꾼쌤)에만. 내 데이터로 실천 가능한 다짐 제안. */}
      {coachEnabled ? <CommitmentSuggestions /> : null}
    </main>
    </div>
  );
}

/**
 * 체중 한 줄 — 데이터 있으면 현재 체중 + 직전 대비 증감(+ 언제 잰 값인지),
 * 없으면 기록하러 가기.
 */
function WeightRow({
  delta,
  measuredAt,
}: {
  delta: { latestKg: number; deltaKg: number | null } | null;
  /** 최근 체중 기록 시각(ISO). 없으면 날짜를 숨긴다. */
  measuredAt: string | null;
}) {
  if (!delta) {
    return (
      <Link
        href="/settings/profile"
        className="app-row text-sm transition active:bg-zinc-100 dark:active:bg-white/[0.06]"
      >
        <span className="flex-1 text-zinc-500 dark:text-zinc-400">체중 기록이 없어요</span>
        <span className="whitespace-nowrap font-semibold text-brand">기록하기</span>
        <ChevronRight aria-hidden="true" size={16} className="-ml-2 shrink-0 text-zinc-400" />
      </Link>
    );
  }

  const d = delta.deltaKg;
  const down = d !== null && d < 0;
  const up = d !== null && d > 0;
  const toneCls = down
    ? "text-brand"
    : up
      ? "text-danger"
      : "text-zinc-500 dark:text-zinc-400";
  return (
    <div className="app-row justify-between">
      <span className="flex items-baseline gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
        현재 체중
        {measuredAt ? (
          <span className="whitespace-nowrap text-xs text-zinc-400 dark:text-zinc-500">
            {shortDateLabel(measuredAt)} 측정
          </span>
        ) : null}
      </span>
      <span className="flex items-center gap-2">
        {d === null ? (
          <span className="text-xs font-semibold text-zinc-400">첫 기록</span>
        ) : (
          <span className={`flex items-center gap-0.5 text-xs font-semibold tabular-nums ${toneCls}`}>
            {down ? (
              <TrendingDown aria-hidden="true" size={13} />
            ) : up ? (
              <TrendingUp aria-hidden="true" size={13} />
            ) : null}
            {d === 0 ? "변화 없음" : `${Math.abs(d)}kg ${down ? "감량" : "증가"}`}
          </span>
        )}
        <span className="whitespace-nowrap text-base font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">
          {delta.latestKg.toLocaleString()}
          <span className="ml-0.5 text-xs font-medium text-zinc-400">kg</span>
        </span>
      </span>
    </div>
  );
}

/** 요약 한 칸 — 라벨 위, 숫자 아래(kcal). */
function SummaryStat({
  label,
  value,
  tone = "text-zinc-950 dark:text-zinc-50",
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className="min-w-0 px-2 text-center">
      <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className={`mt-0.5 truncate text-base font-semibold tabular-nums ${tone}`}>
        {value.toLocaleString()}
        <span className="ml-0.5 text-xs font-medium text-zinc-400">kcal</span>
      </p>
    </div>
  );
}

/**
 * 칼로리 수지 한 칸 — 먹은 양 − (기초대사량 + 운동 + 걷기), 식단 기록한 날만.
 * 음수(빠지는 쪽)는 브랜드색, 양수(찌는 쪽)는 주황, 균형·기록 없음은 회색.
 * "흑자/적자" 는 사람마다 반대로 읽어서 쓰지 않는다(`calorie-balance.ts`).
 */
function BalanceStat({ balance }: { balance: CalorieBalance }) {
  const tone =
    balance.loggedDays === 0 || balance.direction === "even"
      ? "text-zinc-500 dark:text-zinc-400"
      : balance.direction === "loss"
        ? "text-brand"
        : "text-warn";
  return (
    <div className="min-w-0 px-2 text-center" data-testid="calorie-balance">
      <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">칼로리 수지</p>
      <p className={`mt-0.5 truncate text-base font-semibold tabular-nums ${tone}`}>
        {balance.loggedDays === 0 ? "—" : signedKcal(balance.netKcal)}
        {balance.loggedDays === 0 ? null : (
          <span className="ml-0.5 text-xs font-medium text-zinc-400">kcal</span>
        )}
      </p>
      <p className={`truncate text-xs font-semibold ${tone}`}>{directionLabel(balance)}</p>
    </div>
  );
}

/** 수지 근거 한 줄 — 무엇을 더하고 뺐는지. 숫자만 던지면 믿을지 판단을 못 한다. */
function BalanceNote({
  balance,
  stepsTotal,
  bmrPerDay,
}: {
  balance: CalorieBalance;
  stepsTotal: number;
  bmrPerDay: number;
}) {
  return (
    <p className="px-4 pb-2.5 text-xs leading-5 text-zinc-500 dark:text-zinc-400" data-testid="calorie-balance-note">
      {balance.loggedDays === 0
        ? `식단을 기록한 날의 먹은 양 − (기초대사량 ${bmrPerDay.toLocaleString()}kcal/일 + 운동 + 걷기)로 계산해요.`
        : `식단 기록한 ${balance.loggedDays}일 기준 · 기초대사량 ${bmrPerDay.toLocaleString()}kcal/일 포함`}
      {stepsTotal > 0 ? ` · 걷기 ${stepsTotal.toLocaleString()}kcal 는 운동 소비와 따로` : ""}
    </p>
  );
}

/** 운동량 농도 칸 색 — 0(안 함)~3(많이). 브랜드 토큰만(ui-simplify 규칙). */
const LEVEL_BG = ["", "bg-brand/10", "bg-brand/20", "bg-brand/35"] as const;

/** 달력 표시 뜻 — 처음 쓰는 사람이 +/−·덤벨·○△✕·하트를 읽을 수 있게. */
function CalendarLegend({ showCycle }: { showCycle: boolean }) {
  const item = "inline-flex items-center gap-1 whitespace-nowrap";
  return (
    <ul
      aria-label="달력 표시 뜻"
      data-testid="calendar-legend"
      className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1 border-t border-[var(--line)] px-2 pt-2.5 text-xs text-zinc-500 dark:text-zinc-400"
    >
      <li className={item}><span className="tabular-nums">+</span>먹은 kcal</li>
      <li className={item}><span className="tabular-nums text-brand">−</span>움직인 kcal(운동+걷기)</li>
      <li className={item}><Dumbbell aria-hidden="true" size={11} className="text-brand" />근력운동</li>
      <li className={item}><Footprints aria-hidden="true" size={11} style={{ color: "var(--info)" }} />런닝 거리</li>
      <li className={item}><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500" />체중 잰 날</li>
      <li className={item}><span aria-hidden="true" className="inline-flex gap-px"><span className={`h-2.5 w-2.5 rounded-sm ${LEVEL_BG[1]}`} /><span className={`h-2.5 w-2.5 rounded-sm ${LEVEL_BG[2]}`} /><span className={`h-2.5 w-2.5 rounded-sm ${LEVEL_BG[3]}`} /></span>진할수록 운동 많이</li>
      <li className={item}><span className="text-zinc-400 dark:text-zinc-500">회색 글자</span>예정 루틴</li>
      <li className={item}><span className="font-bold"><span className="text-brand">○</span><span className="text-amber-500">△</span><span className="text-rose-400">✕</span></span>다짐 달성</li>
      {showCycle ? (
        <li className={item}><Heart aria-hidden="true" size={10} className="fill-rose-500 text-rose-500" />생리·예정</li>
      ) : null}
    </ul>
  );
}

/**
 * 주간 — 요일마다 한 줄. 먹은 양(회색)·움직인 양(초록) 막대는 그 주 최대값에 맞춰 길이를 정한다.
 * 한 줄을 누르면 그날 상세로. 달력 칸과 같은 읽기 문장을 단다.
 */
function WeekList({
  dates,
  today,
  byDate,
  missionMarks,
  periodDays,
  predictedDays,
  planFor,
}: {
  planFor: (date: string) => { label: string; rest: boolean } | null;
  dates: string[];
  today: string;
  byDate: Map<string, DaySummary>;
  missionMarks: Record<string, { marker: keyof typeof MARKER_SYMBOL; pct: number }>;
  periodDays: Set<string>;
  predictedDays: Set<string>;
}) {
  const max = Math.max(
    1,
    ...dates.map((d) => Math.max(byDate.get(d)?.intake ?? 0, byDate.get(d)?.burned ?? 0)),
  );
  const pct = (n: number) => `${Math.max(n > 0 ? 3 : 0, Math.round((n / max) * 100))}%`;
  return (
    <ul className="divide-y divide-[var(--line)]" data-testid="week-list">
      {dates.map((date, i) => {
        const s = byDate.get(date);
        const isToday = date === today;
        const holiday = getDayMarks(date).find((mk) => mk.kind === "holiday");
        const red = isHoliday(date) || i === 6;
        const mMark = missionMarks[date];
        const isPeriod = periodDays.has(date);
        const isPredicted = predictedDays.has(date);
        return (
          <li key={date}>
            <Link
              href={`/calendar/${date}`}
              aria-label={dayAriaLabel({
                date,
                isToday,
                holiday: holiday?.name ?? null,
                intake: s?.intake ?? 0,
                burned: s?.burned ?? 0,
                didWeight: !!s?.didWeight,
                missionPct: mMark ? mMark.pct : null,
                period: isPeriod ? "period" : isPredicted ? "predicted" : null,
                runM: s?.runM ?? 0,
                weighedKg: s?.weighedKg ?? null,
              })}
              aria-current={isToday ? "date" : undefined}
              className="flex items-center gap-3 py-2.5 transition active:bg-zinc-100 dark:active:bg-white/[0.06]"
            >
              <span className="w-10 shrink-0 text-center">
                <span className={`block text-xs ${red ? "text-danger" : "text-zinc-500 dark:text-zinc-400"}`}>
                  {WEEKDAYS[i]}
                </span>
                <span
                  className={`mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold tabular-nums ${
                    isToday
                      ? "bg-brand text-white dark:text-zinc-950"
                      : red
                        ? "text-danger"
                        : "text-zinc-900 dark:text-zinc-100"
                  }`}
                >
                  {Number(date.slice(8))}
                </span>
              </span>
              <span className="min-w-0 flex-1 space-y-1">
                {holiday ? <span className="block truncate text-xs text-danger">{holiday.name}</span> : null}
                {!s && planFor(date)?.label ? (
                  <span data-testid="planned" className="block truncate text-xs text-zinc-400 dark:text-zinc-500">
                    예정 · {planFor(date)!.label}
                  </span>
                ) : null}
                <span className="flex items-center gap-2">
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-white/[0.06]">
                    <span
                      className="block h-full rounded-full bg-zinc-400 dark:bg-zinc-500"
                      style={{ width: pct(s?.intake ?? 0) }}
                    />
                  </span>
                  <span className="w-14 shrink-0 text-right text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                    {s && s.intake > 0 ? `+${s.intake.toLocaleString()}` : "—"}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-white/[0.06]">
                    <span className="block h-full rounded-full bg-brand" style={{ width: pct(s?.burned ?? 0) }} />
                  </span>
                  <span className="w-14 shrink-0 text-right text-xs tabular-nums text-brand">
                    {s && s.burned > 0 ? `-${s.burned.toLocaleString()}` : "—"}
                  </span>
                </span>
              </span>
              <span className="flex w-14 shrink-0 flex-col items-end gap-0.5 text-xs">
                <span className="flex items-center gap-1">
                  {mMark ? (
                    <span
                      className={`font-bold ${
                        mMark.marker === "circle"
                          ? "text-brand"
                          : mMark.marker === "triangle"
                            ? "text-amber-500"
                            : "text-rose-400"
                      }`}
                    >
                      {MARKER_SYMBOL[mMark.marker]}
                    </span>
                  ) : null}
                  {s?.didWeight ? <Dumbbell aria-hidden="true" size={11} className="text-brand" /> : null}
                  {isPeriod || isPredicted ? (
                    <Heart
                      aria-hidden="true"
                      size={10}
                      className={isPeriod ? "fill-rose-500 text-rose-500" : "text-rose-300 dark:text-rose-700"}
                    />
                  ) : null}
                  {typeof s?.weighedKg === "number" ? (
                    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                  ) : null}
                </span>
                {s && s.runM > 0 ? (
                  <span className="font-semibold tabular-nums" style={{ color: "var(--info)" }}>
                    {distanceLabel(s.runM)}
                  </span>
                ) : null}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
