import { calendarWeek } from "@/features/launcher/calendar-range";
import { getHomeDashboard } from "@/features/home/home-data";
import { TodayGoalCard } from "@/features/routine/components/today-goal-card";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Heart,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/supabase/server";
import { getUserProfile } from "@/features/profile/data-access";
import { seoulYmd } from "@/features/routine/data";
import { getMonthlyCalendar } from "@/features/calendar/data-access";
import { getMissionCalendar } from "@/features/commitments/data-access";
import { MARKER_SYMBOL } from "@/features/commitments/missions";
import { getBodyLogs } from "@/features/profile/body-logs";
import {
  computeWeightDelta,
  latestWeightAt,
} from "@/features/profile/weight-delta";
import { shortDateLabel } from "@/features/profile/body-chart-data";
import { StepsSync } from "@/features/health/components/steps-sync";
import { CommitmentSuggestions } from "@/features/coach/components/commitment-suggestions";
import { isDebugFeatureEnabled } from "@/features/admin/debug-features.server";
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
  if (view === "goals") {
    const dashboard = await getHomeDashboard();
    return <main className="app-page app-container space-y-4"><h1 className="text-2xl font-bold">나의 목표</h1>
      <TodayGoalCard goal={dashboard.goalCard} missions={[]} totalMissions={0} current={dashboard.current} />
      <Link href="/settings/profile" className="app-card block p-4 font-semibold">체형 목표 설정·기록 →</Link>
      <Link href="/commitments" className="app-card block p-4"><h2 className="font-bold">오늘의 다짐</h2><p className="mt-2 text-sm text-zinc-500">{dashboard.todayCommitments.filter(item => item.done).length} / {dashboard.todayCommitments.length}개 달성 · 다짐 관리 →</p></Link>
    </main>;
  }
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
  const [
    { byDate, intakeTotal, workoutBurnedTotal },
    bodyLogs,
    profile,
    debug,
    coachEnabled,
    missionMarks,
  ] = await Promise.all([
    getMonthlyCalendar(from, to),
    getBodyLogs(),
    getUserProfile(),
    isDebugFeatureEnabled("steps"),
    isDebugFeatureEnabled("helssu-coach"),
    getMissionCalendar(from, to),
  ]);
  const spent = workoutBurnedTotal - intakeTotal;

  // 체중 증감 — 직전 기록 대비. 기록 없으면 null(→ '체형 기록하러 가기' 버튼).
  const weightDelta = computeWeightDelta(bodyLogs.map((l) => l.weightKg));
  const weightMeasuredAt = latestWeightAt(bodyLogs);
  const periodDays = new Set<string>();
  const predictedDays = new Set<string>();
  if (profile?.gender === "female") {
    const [logs, startDates] = await Promise.all([
      getCycleLogsRange(from, to),
      getPeriodStartDates(),
    ]);
    for (const l of logs) if (l.isPeriod) periodDays.add(l.forDate);
    const pred = predictCycle(startDates, today);
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
    <PageHeader title="캘린더">
      <Link
        href={isWeek ? `/calendar?view=week&d=${week.previous}` : `/calendar?m=${monthParam(prev)}${view === "stats" ? "&view=stats" : ""}`}
        aria-label={isWeek ? "이전 주" : "이전 달"}
        className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition active:bg-zinc-100 dark:text-zinc-400 dark:active:bg-white/[0.06]"
      >
        <ChevronLeft aria-hidden="true" size={18} />
      </Link>
      <h2 className="min-w-[5.5rem] text-center text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
        {isWeek ? `${week.from} ~ ${week.to}` : `${year}년 ${month0 + 1}월`}
      </h2>
      <Link
        href={isWeek ? `/calendar?view=week&d=${week.next}` : `/calendar?m=${monthParam(next)}${view === "stats" ? "&view=stats" : ""}`}
        aria-label={isWeek ? "다음 주" : "다음 달"}
        className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition active:bg-zinc-100 dark:text-zinc-400 dark:active:bg-white/[0.06]"
      >
        <ChevronRight aria-hidden="true" size={18} />
      </Link>
    </PageHeader>
    <main className="app-container space-y-5">
      {/* 걸음수 동기화(네이티브) + 생리 기록(여성). 둘 다 없으면 줄째 숨긴다. */}
      <div className="flex items-center justify-end gap-2 empty:hidden">
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

      {/* 캘린더 — 칸 높이 52px(날짜 + 섭취/소비 두 줄이 딱 들어가는 높이) */}
      <div className={view === "stats" ? "hidden" : "app-card px-2 py-4"}>
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
            // 일요일·공휴일만 빨강. 토요일 파랑은 뺐다(색을 줄여 날짜 기록이 먼저 보이게).
            const dayColor = isHol || col === 6
              ? "text-danger"
              : "text-zinc-800 dark:text-zinc-200";
            return (
              <Link
                key={date}
                href={`/calendar/${date}`}
                className="relative flex min-h-[3.25rem] flex-col items-center rounded-lg px-0.5 py-0.5 transition active:bg-zinc-100 dark:active:bg-white/[0.06]"
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
              </Link>
            );
          })}
        </div>
      </div>

      {/* 월 요약 — 카드 4장을 한 장으로: 섭취·소비·수지 세 칸 + 체중 한 줄 */}
      <section>
        <h2 className="app-section-label">{isWeek ? "이번 주 요약" : "이번 달 요약"}</h2>
        <div className="app-list">
          <div className="grid grid-cols-3 divide-x divide-[var(--line)] py-2.5">
            <SummaryStat label="총 섭취" value={intakeTotal} />
            <SummaryStat label="운동 소비" value={workoutBurnedTotal} />
            <NetStat spent={spent} />
          </div>
          <div>
            <WeightRow delta={weightDelta} measuredAt={weightMeasuredAt} />
          </div>
        </div>
      </section>

      {/* AI 다짐 짜주기 — 디버그 계정(헬쑤쌤)에만. 내 데이터로 실천 가능한 다짐 제안. */}
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

/** 칼로리 흑자/적자 = 운동 소비 − 총 섭취.
 *  소비가 더 많으면 '흑자'(브랜드색, 양수), 섭취가 더 많으면 '적자'(위험색, 음수). */
function NetStat({ spent }: { spent: number }) {
  const surplus = spent > 0; // 소비 > 섭취 → 흑자
  const deficit = spent < 0; // 섭취 > 소비 → 적자
  const tone = surplus
    ? "text-brand"
    : deficit
      ? "text-danger"
      : "text-zinc-500 dark:text-zinc-400";
  const label = surplus ? "칼로리 흑자" : deficit ? "칼로리 적자" : "칼로리 균형";
  return <SummaryStat label={label} value={spent} tone={tone} />;
}
