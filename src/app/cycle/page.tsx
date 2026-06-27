import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { getCurrentUser } from "@/lib/supabase/server";
import { getUserProfile } from "@/features/profile/data-access";
import { seoulYmd } from "@/features/routine/data";
import { getCycleLogsRange, getPeriodStartDates } from "@/features/cycle/data-access";
import { predictCycle, predictedPeriodDatesInRange } from "@/features/cycle/cycle-predict";
import { CycleBoard } from "@/features/cycle/components/cycle-board";

export const dynamic = "force-dynamic";
export const metadata = { title: "생리 기록" };

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

export default async function CyclePage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const profile = await getUserProfile();
  if (!profile) redirect("/onboarding");

  if (profile.gender !== "female") {
    return (
      <main className="mx-auto w-full max-w-md px-4 py-16 text-center">
        <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          생리 기록은 현재 <b>여성</b> 프로필에서 제공돼요.
          <br />
          설정 &gt; 체형 정보에서 성별을 바꿀 수 있어요.
        </p>
        <Link
          href="/calendar"
          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-emerald-600"
        >
          <ChevronLeft size={16} /> 캘린더로
        </Link>
      </main>
    );
  }

  const { m } = await searchParams;
  const { year, month0 } = parseMonth(m);
  const dim = daysInMonth(year, month0);
  const from = ymd(year, month0 + 1, 1);
  const to = ymd(year, month0 + 1, dim);
  const today = seoulYmd();

  const [logs, startDates] = await Promise.all([
    getCycleLogsRange(from, to),
    getPeriodStartDates(),
  ]);
  const prediction = predictCycle(startDates, today);
  const predicted = predictedPeriodDatesInRange(prediction, from, to);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
      <CycleBoard
        year={year}
        month0={month0}
        today={today}
        logs={logs}
        prediction={prediction}
        predicted={predicted}
      />
    </main>
  );
}
