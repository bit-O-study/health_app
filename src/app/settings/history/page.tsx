import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight as ChevronRightIcon } from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/features/profile/data-access";
import {
  DAY_BLOCKS,
  isDayBlockId,
  seoulYmd,
  type DayBlockId,
  type FocusTone,
} from "@/features/routine/data";

export const dynamic = "force-dynamic";

const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"] as const;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
function ymd(y: number, m1: number, d: number): string {
  return `${y}-${pad(m1)}-${pad(d)}`;
}
function daysInMonth(year: number, month0: number): number {
  return new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
}
function parseMonthParam(s: string | undefined): {
  year: number;
  month0: number;
} {
  if (s && /^\d{4}-\d{2}$/.test(s)) {
    const [y, m] = s.split("-").map(Number);
    if (m >= 1 && m <= 12) return { year: y, month0: m - 1 };
  }
  const [yy, mm] = seoulYmd().split("-").map(Number);
  return { year: yy, month0: mm - 1 };
}
function shiftMonth(year: number, month0: number, delta: number) {
  const d = new Date(Date.UTC(year, month0 + delta, 1));
  return { year: d.getUTCFullYear(), month0: d.getUTCMonth() };
}
function jsDayToMonStart(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1;
}

function isFocusKey(s: string): s is Exclude<FocusTone, "rest"> {
  return s !== "rest" && s in DAY_BLOCKS;
}

function blockLabel(focus: string): string {
  return isDayBlockId(focus) ? DAY_BLOCKS[focus as DayBlockId].label : focus;
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const profile = await getUserProfile();
  if (!profile) redirect("/onboarding");

  const { month } = await searchParams;
  const { year, month0 } = parseMonthParam(month);
  const monthLabel = `${year}년 ${month0 + 1}월`;
  const monthStart = ymd(year, month0 + 1, 1);
  const monthEnd = ymd(year, month0 + 1, daysInMonth(year, month0));
  const prev = shiftMonth(year, month0, -1);
  const next = shiftMonth(year, month0, +1);
  const todayYmd = seoulYmd();

  type CompRow = {
    for_date: string;
    routine_exercises: { focus: string }[] | null;
  };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const exRes = user
    ? await supabase
        .from("exercise_completions")
        .select("for_date, routine_exercises(focus)")
        .eq("user_id", user.id)
        .eq("status", "done")
        .gte("for_date", monthStart)
        .lte("for_date", monthEnd)
    : { data: [] as CompRow[] };

  // 일자별 focus 카운트, 월별 focus 누적 카운트
  const dayFocusCounts = new Map<string, Map<string, number>>();
  const focusMonthCount = new Map<string, number>();
  for (const r of (exRes.data ?? []) as CompRow[]) {
    const focus = r.routine_exercises?.[0]?.focus ?? null;
    if (!focus || !isFocusKey(focus)) continue;
    if (!dayFocusCounts.has(r.for_date))
      dayFocusCounts.set(r.for_date, new Map());
    const m = dayFocusCounts.get(r.for_date)!;
    m.set(focus, (m.get(focus) ?? 0) + 1);
    focusMonthCount.set(focus, (focusMonthCount.get(focus) ?? 0) + 1);
  }

  function dominantFocus(date: string): string | null {
    const m = dayFocusCounts.get(date);
    if (!m || m.size === 0) return null;
    let best: { focus: string; n: number } | null = null;
    for (const [f, n] of m.entries()) {
      if (!best || n > best.n) best = { focus: f, n };
    }
    return best?.focus ?? null;
  }

  // 캘린더 셀
  const dim = daysInMonth(year, month0);
  const firstJsDay = new Date(Date.UTC(year, month0, 1)).getUTCDay();
  const lead = jsDayToMonStart(firstJsDay);
  const total = lead + dim;
  const trail = (7 - (total % 7)) % 7;
  const cells: ({ ymd: string; day: number } | null)[] = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push({ ymd: ymd(year, month0 + 1, d), day: d });
  for (let i = 0; i < trail; i++) cells.push(null);

  // 부위별 통계 (가슴/등/하체/...)
  const focusStats = Array.from(focusMonthCount.entries()).sort(
    (a, b) => b[1] - a[1],
  );

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10 sm:px-8">
      <Link
        className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 transition hover:text-zinc-800"
        href="/settings"
      >
        <ChevronLeft aria-hidden="true" size={16} />
        설정
      </Link>

      <div className="mt-6 mb-6 space-y-1">
        <h1 className="text-2xl font-bold text-zinc-950">운동 기록</h1>
        <p className="text-sm leading-6 text-zinc-600">
          <strong>완료 처리한 운동만</strong> 표시합니다. 날짜를 누르면 그
          날의 완료 운동·총 칼로리 상세를 볼 수 있어요.
        </p>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <Link
            href={`/settings/history?month=${prev.year}-${pad(prev.month0 + 1)}`}
            className="inline-flex h-9 items-center gap-1 rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            <ChevronLeft aria-hidden="true" size={15} />
            이전
          </Link>
          <h2 className="text-lg font-bold text-zinc-950">{monthLabel}</h2>
          <Link
            href={`/settings/history?month=${next.year}-${pad(next.month0 + 1)}`}
            className="inline-flex h-9 items-center gap-1 rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            다음
            <ChevronRightIcon aria-hidden="true" size={15} />
          </Link>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map((w) => (
            <div
              key={w}
              className="py-1 text-center text-[11px] font-semibold text-zinc-500"
            >
              {w}
            </div>
          ))}
          {cells.map((cell, i) => {
            if (cell === null) {
              return <div key={`pad-${i}`} className="h-16" />;
            }
            const focus = dominantFocus(cell.ymd);
            const label = focus ? blockLabel(focus) : "";
            const isToday = cell.ymd === todayYmd;
            const hasActivity = focus !== null;
            return (
              <Link
                key={cell.ymd}
                href={`/settings/history/${cell.ymd}`}
                title={`${cell.ymd} 상세 보기`}
                className={`flex h-16 flex-col items-center justify-center rounded-md text-xs font-semibold transition ${
                  hasActivity
                    ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                    : "bg-zinc-100 text-zinc-400 hover:bg-zinc-200"
                } ${isToday ? "ring-2 ring-emerald-600 ring-offset-1" : ""}`}
              >
                <span>{cell.day}</span>
                {label ? (
                  <span className="mt-0.5 text-[10px] font-bold">{label}</span>
                ) : null}
              </Link>
            );
          })}
        </div>

        {/* 부위별 통계 */}
        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            이 달 부위별 완료
          </p>
          {focusStats.length === 0 ? (
            <p className="text-sm text-zinc-500">
              아직 이 달 완료된 운동이 없습니다.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {focusStats.map(([focus, count]) => (
                <span
                  key={focus}
                  className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-800"
                >
                  {blockLabel(focus)}
                  <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white">
                    {count}회
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
