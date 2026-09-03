import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Flame,
  Heart,
  Scale,
  TrendingDown,
  TrendingUp,
  Utensils,
  Weight,
} from "lucide-react";

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
    <main className="app-page app-container">
      <div className="mb-4 flex items-center justify-between">
        <Link
          href={`/calendar?m=${monthParam(prev)}`}
          aria-label="이전 달"
          className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          <ChevronLeft aria-hidden="true" size={20} />
        </Link>
        <h1 className="text-lg font-bold text-zinc-950 dark:text-zinc-50">
          {year}년 {month0 + 1}월
        </h1>
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
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 text-xs font-bold text-rose-600 transition hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
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
              className={`pb-1 text-center text-[11px] font-bold ${
                i === 5 ? "text-sky-600" : i === 6 ? "text-rose-500" : "text-zinc-400"
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
            const dayColor = isHol || col === 6
              ? "text-rose-500 dark:text-rose-400"
              : col === 5
                ? "text-sky-600 dark:text-sky-400"
                : "text-zinc-700 dark:text-zinc-300";
            return (
              <Link
                key={date}
                href={`/calendar/${date}`}
                className={`relative flex min-h-[64px] flex-col items-center rounded-lg border p-1 transition hover:border-emerald-300 dark:hover:border-emerald-700 ${
                  isToday
                    ? "border-emerald-400 bg-emerald-50/50 dark:border-emerald-600 dark:bg-emerald-950/30"
                    : "border-transparent"
                }`}
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
                    className="absolute bottom-0.5 right-0.5 text-emerald-500 dark:text-emerald-400"
                    size={11}
                  />
                ) : null}
                {mMark ? (
                  <span
                    aria-label={`미션 달성 ${mMark.pct}%`}
                    className={`absolute left-0.5 top-0.5 text-[11px] font-black leading-none ${
                      mMark.marker === "circle"
                        ? "text-emerald-500"
                        : mMark.marker === "triangle"
                          ? "text-amber-500"
                          : "text-rose-400"
                    }`}
                  >
                    {MARKER_SYMBOL[mMark.marker]}
                  </span>
                ) : null}
                <span
                  className={`text-xs font-bold ${
                    isToday ? "text-emerald-700 dark:text-emerald-400" : dayColor
                  }`}
                >
                  {day}
                </span>
                {holiday ? (
                  <span className="w-full truncate text-center text-[8px] font-semibold leading-tight text-rose-500 dark:text-rose-400">
                    {holiday.name}
                  </span>
                ) : bok ? (
                  <span className="w-full truncate text-center text-[8px] font-semibold leading-tight text-orange-500 dark:text-orange-400">
                    {bok.name}
                  </span>
                ) : null}
                {s && s.intake > 0 ? (
                  <span className="mt-0.5 text-[10px] font-bold tabular-nums text-amber-600 dark:text-amber-400">
                    +{s.intake}
                  </span>
                ) : null}
                {s && s.burned > 0 ? (
                  <span className="text-[10px] font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
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
        className="flex items-center justify-between gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 shadow-sm transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
      >
        <span className="flex items-center gap-1">
          <Weight size={15} className="shrink-0" />
          체중 기록이 없어요
        </span>
        <span className="whitespace-nowrap">체형 기록하러 가기 →</span>
      </Link>
    );
  }

  const d = delta.deltaKg;
  const down = d !== null && d < 0;
  const up = d !== null && d > 0;
  const toneCls = down
    ? "text-emerald-600 dark:text-emerald-400"
    : up
      ? "text-rose-600 dark:text-rose-400"
      : "text-zinc-500 dark:text-zinc-400";
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <span className="flex items-center gap-1 text-xs font-bold text-zinc-500 dark:text-zinc-400">
        <Weight size={15} className="shrink-0" />
        현재 체중
        {measuredAt ? (
          <span className="ml-0.5 whitespace-nowrap text-[10px] font-semibold text-zinc-400 dark:text-zinc-500">
            {shortDateLabel(measuredAt)} 측정
          </span>
        ) : null}
      </span>
      <span className="flex items-center gap-2">
        <span className="whitespace-nowrap text-lg font-extrabold tabular-nums text-zinc-950 dark:text-zinc-50">
          {delta.latestKg.toLocaleString()}
          <span className="ml-0.5 text-xs font-semibold text-zinc-400">kg</span>
        </span>
        {d === null ? (
          <span className="text-[11px] font-semibold text-zinc-400">첫 기록</span>
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
  const toneCls = {
    amber: "text-amber-600 dark:text-amber-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
  }[tone];
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <span className={`flex items-center gap-1 text-[11px] font-bold ${toneCls}`}>
        {icon}
        {label}
      </span>
      <p className="mt-1 text-lg font-extrabold tabular-nums text-zinc-950 dark:text-zinc-50">
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
    ? "text-emerald-600 dark:text-emerald-400"
    : deficit
      ? "text-rose-600 dark:text-rose-400"
      : "text-zinc-500 dark:text-zinc-400";
  const label = surplus ? "칼로리 흑자" : deficit ? "칼로리 적자" : "칼로리 균형";
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <span className={`flex items-center gap-1 text-xs font-bold ${toneCls}`}>
        <Scale size={15} className="shrink-0" />
        {label}
      </span>
      <span className={`whitespace-nowrap text-lg font-extrabold tabular-nums ${toneCls}`}>
        {/* 흑자면 300, 적자면 -300 그대로 표기 */}
        {spent.toLocaleString()}
        <span className="ml-0.5 text-xs font-semibold text-zinc-400">kcal</span>
      </span>
    </div>
  );
}
