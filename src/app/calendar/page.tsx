import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Flame,
  Heart,
  TrendingDown,
  TrendingUp,
  Utensils,
  Weight,
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
  searchParams: Promise<{ m?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { m } = await searchParams;
  const { year, month0 } = parseMonth(m);
  const dim = daysInMonth(year, month0);
  const from = ymd(year, month0 + 1, 1);
  const to = ymd(year, month0 + 1, dim);
  const prev = shiftMonth(year, month0, -1);
  const next = shiftMonth(year, month0, +1);
  const monthParam = (mm: { year: number; month0: number }) =>
    `${mm.year}-${pad(mm.month0 + 1)}`;
  const today = seoulYmd();
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
  const lead = leadDays(firstJsDay);
  const cells: (number | null)[] = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="app-page">
    <PageHeader title="캘린더" />
    <main className="app-container">
      <div className="mb-4 flex items-center justify-between">
        <Link
          href={`/calendar?m=${monthParam(prev)}`}
          aria-label="이전 달"
          className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          <ChevronLeft aria-hidden="true" size={20} />
        </Link>
        <h2 className="text-lg font-bold text-zinc-950 dark:text-zinc-50">
          {year}년 {month0 + 1}월
        </h2>
        <Link
          href={`/calendar?m=${monthParam(next)}`}
          aria-label="다음 달"
          className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          <ChevronRight aria-hidden="true" size={20} />
        </Link>
      </div>

      {/* 걸음수 동기화(네이티브) + 생리 기록(여성, 설정에서 캘린더로 이동). */}
      <div className="mb-3 flex items-center justify-end gap-2">
        {profile?.gender === "female" ? (
          <Link
            href="/cycle"
            className="app-press inline-flex h-8 items-center gap-1.5 rounded-full bg-zinc-100 px-3 text-xs font-semibold text-zinc-700 dark:bg-white/[0.08] dark:text-zinc-200"
          >
            <Heart aria-hidden="true" size={13} />
            생리 기록
          </Link>
        ) : null}
        <StepsSync debug={debug} />
      </div>

      {/* 캘린더 */}
      <div className="app-card p-2 sm:p-3">
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
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((day, idx) => {
            if (day === null) return <div key={`e${idx}`} />;
            const date = ymd(year, month0 + 1, day);
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
                className="relative flex min-h-[64px] flex-col items-center rounded-lg p-1 transition active:bg-zinc-100 dark:active:bg-white/[0.06]"
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
                    size={11}
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
                {/* 오늘은 아이폰 달력처럼 브랜드색 동그라미 안에 흰 숫자. */}
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums ${
                    isToday ? "bg-brand text-white dark:text-zinc-950" : dayColor
                  }`}
                >
                  {day}
                </span>
                {holiday ? (
                  <span className="w-full truncate text-center text-xs leading-tight text-danger">
                    {holiday.name}
                  </span>
                ) : bok ? (
                  <span className="w-full truncate text-center text-xs leading-tight text-zinc-500 dark:text-zinc-400">
                    {bok.name}
                  </span>
                ) : null}
                {s && s.intake > 0 ? (
                  <span className="mt-0.5 text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                    +{s.intake}
                  </span>
                ) : null}
                {s && s.burned > 0 ? (
                  <span className="text-xs tabular-nums text-brand">
                    -{s.burned}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </div>

      {/* 월 요약 */}
      <div className="mt-5 space-y-2">
        <h2 className="text-sm font-bold text-zinc-500 dark:text-zinc-400">
          이번 달 요약
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <SummaryCard
            icon={<Utensils size={16} />}
            tone="amber"
            label="총 섭취"
            value={intakeTotal}
          />
          <SummaryCard
            icon={<Flame size={16} />}
            tone="emerald"
            label="운동 소비"
            value={workoutBurnedTotal}
          />
        </div>
        <NetCard spent={spent} />
        <WeightCard delta={weightDelta} measuredAt={weightMeasuredAt} />
      </div>

      {/* AI 다짐 짜주기 — 디버그 계정(헬쑤쌤)에만. 내 데이터로 실천 가능한 다짐 제안. */}
      {coachEnabled ? (
        <div className="mt-4">
          <CommitmentSuggestions />
        </div>
      ) : null}
    </main>
    </div>
  );
}

/**
 * 체중 카드 — 데이터 있으면 현재 체중 + 직전 대비 증감(+ 언제 잰 값인지),
 * 없으면 기록하러 가기 버튼.
 */
function WeightCard({
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
        className="app-card flex items-center gap-2 px-4 py-3 text-sm transition active:opacity-70"
      >
        <Weight size={15} className="shrink-0 text-zinc-400" />
        <span className="flex-1 text-zinc-500 dark:text-zinc-400">체중 기록이 없어요</span>
        <span className="whitespace-nowrap font-semibold text-brand">기록하기</span>
        <ChevronRight aria-hidden="true" size={16} className="shrink-0 text-zinc-400" />
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
    <div className="flex items-center justify-between gap-2 app-card px-4 py-3">
      <span className="flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
        현재 체중
        {measuredAt ? (
          <span className="ml-0.5 whitespace-nowrap text-xs text-zinc-400 dark:text-zinc-500">
            {shortDateLabel(measuredAt)} 측정
          </span>
        ) : null}
      </span>
      <span className="flex items-center gap-2">
        <span className="whitespace-nowrap text-lg font-bold tabular-nums text-zinc-950 dark:text-zinc-50">
          {delta.latestKg.toLocaleString()}
          <span className="ml-0.5 text-xs font-semibold text-zinc-400">kg</span>
        </span>
        {d === null ? (
          <span className="text-xs font-semibold text-zinc-400">첫 기록</span>
        ) : (
          <span className={`flex items-center gap-0.5 text-xs font-bold tabular-nums ${toneCls}`}>
            {down ? (
              <TrendingDown size={14} />
            ) : up ? (
              <TrendingUp size={14} />
            ) : null}
            {d === 0 ? "변화 없음" : `${Math.abs(d)}kg ${down ? "감량" : "증가"}`}
          </span>
        )}
      </span>
    </div>
  );
}

function SummaryCard({
  icon,
  tone,
  label,
  value,
}: {
  icon: React.ReactNode;
  tone: "amber" | "emerald";
  label: string;
  value: number;
}) {
  // 라벨은 회색 하나로 — 아이콘 색으로 구분하던 주황/초록은 뺐다(tone 은 호출부 호환용).
  void tone;
  void icon;
  return (
    <div className="app-card p-3">
      <span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
      <p className="mt-1 text-lg font-bold tabular-nums text-zinc-950 dark:text-zinc-50">
        {value.toLocaleString()}
        <span className="ml-0.5 text-xs font-semibold text-zinc-400">kcal</span>
      </p>
    </div>
  );
}

/** 칼로리 흑자/적자 = 운동 소비 − 총 섭취.
 *  소비가 더 많으면 '흑자'(초록, 양수), 섭취가 더 많으면 '적자'(빨강, 음수). 전체 너비 카드. */
function NetCard({ spent }: { spent: number }) {
  const surplus = spent > 0; // 소비 > 섭취 → 흑자
  const deficit = spent < 0; // 섭취 > 소비 → 적자
  const toneCls = surplus
    ? "text-brand"
    : deficit
      ? "text-danger"
      : "text-zinc-500 dark:text-zinc-400";
  const label = surplus ? "칼로리 흑자" : deficit ? "칼로리 적자" : "칼로리 균형";
  return (
    <div className="flex items-center justify-between gap-2 app-card px-4 py-3">
      <span className="text-sm text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className={`whitespace-nowrap text-lg font-bold tabular-nums ${toneCls}`}>
        {/* 흑자면 300, 적자면 -300 그대로 표기 */}
        {spent.toLocaleString()}
        <span className="ml-0.5 text-xs font-semibold text-zinc-400">kcal</span>
      </span>
    </div>
  );
}
