import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight as ChevronRightIcon } from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/features/profile/data-access";
import { seoulYmd } from "@/features/routine/data";

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
  // JS: 0=일~6=토 → 월=0..일=6
  return jsDay === 0 ? 6 : jsDay - 1;
}

function colorForCount(n: number): string {
  if (n <= 0) return "bg-zinc-100 text-zinc-400";
  if (n < 3) return "bg-emerald-200 text-emerald-800";
  if (n < 6) return "bg-emerald-400 text-white";
  if (n < 9) return "bg-emerald-600 text-white";
  return "bg-emerald-800 text-white";
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

  // 해당 월의 완료 기록 수집
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const exerciseRes = user
    ? await supabase
        .from("exercise_completions")
        .select("for_date")
        .eq("user_id", user.id)
        .eq("status", "done")
        .gte("for_date", monthStart)
        .lte("for_date", monthEnd)
    : { data: [] as { for_date: string }[] };
  const condRes = user
    ? await supabase
        .from("conditioning_completions")
        .select("for_date")
        .eq("user_id", user.id)
        .eq("status", "done")
        .gte("for_date", monthStart)
        .lte("for_date", monthEnd)
    : { data: [] as { for_date: string }[] };

  const dayCounts = new Map<string, number>();
  for (const r of (exerciseRes.data ?? []) as { for_date: string }[]) {
    dayCounts.set(r.for_date, (dayCounts.get(r.for_date) ?? 0) + 1);
  }
  for (const r of (condRes.data ?? []) as { for_date: string }[]) {
    dayCounts.set(r.for_date, (dayCounts.get(r.for_date) ?? 0) + 1);
  }

  // 캘린더 셀 생성: 월 시작 요일까지 빈칸 + 일자 + 끝 요일까지 빈칸
  const dim = daysInMonth(year, month0);
  const firstJsDay = new Date(Date.UTC(year, month0, 1)).getUTCDay();
  const lead = jsDayToMonStart(firstJsDay);
  const total = lead + dim;
  const trail = (7 - (total % 7)) % 7;
  const cells: ({ ymd: string; day: number } | null)[] = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push({ ymd: ymd(year, month0 + 1, d), day: d });
  for (let i = 0; i < trail; i++) cells.push(null);

  const activeDays = Array.from(dayCounts.keys()).filter(
    (k) => (dayCounts.get(k) ?? 0) > 0,
  ).length;
  const totalCompletions = Array.from(dayCounts.values()).reduce(
    (s, n) => s + n,
    0,
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
          <strong>완료 처리한 운동만</strong> 집계합니다(휴식 처리·미완료
          제외). 칸 색이 진할수록 그 날 많이 완료했어요.
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
              return <div key={`pad-${i}`} className="h-12" />;
            }
            const count = dayCounts.get(cell.ymd) ?? 0;
            const isToday = cell.ymd === todayYmd;
            return (
              <div
                key={cell.ymd}
                title={`${cell.ymd} · 완료 ${count}건`}
                className={`flex h-12 flex-col items-center justify-center rounded-md text-xs font-semibold ${colorForCount(count)} ${
                  isToday ? "ring-2 ring-emerald-600 ring-offset-1" : ""
                }`}
              >
                <span>{cell.day}</span>
                {count > 0 ? (
                  <span className="text-[10px] font-normal opacity-90">
                    {count}건
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="월 활동일" value={`${activeDays}일`} />
          <Stat label="월 누적 완료" value={`${totalCompletions}건`} />
          <Stat label="월 일수" value={`${dim}일`} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500">
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-zinc-100" />
            없음
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-emerald-200" />
            1~2건
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-emerald-400" />
            3~5건
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-emerald-600" />
            6~8건
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-emerald-800" />
            9건 이상
          </span>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
      <p className="text-xs font-semibold text-zinc-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-zinc-950">{value}</p>
    </div>
  );
}
