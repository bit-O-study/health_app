import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
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
      <div className="app-page">
        <PageHeader title="생리 기록" back="캘린더" backHref="/calendar" />
        <main className="app-container">
          <p className="app-card p-3 text-center text-sm text-zinc-500 dark:text-zinc-400">
            여성 프로필에서 쓸 수 있어요 (설정 &gt; 체형 정보)
          </p>
        </main>
      </div>
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

  // 머리글(제목 + 달 이동)과 본문은 CycleBoard 가 그린다 — 달 이동이 보드 상태(저장 중)를 봐서.
  return (
    <div className="app-page">
      <CycleBoard
        year={year}
        month0={month0}
        today={today}
        logs={logs}
        prediction={prediction}
        predicted={predicted}
      />
    </div>
  );
}
