"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";

import { cn } from "@/lib/utils";
import {
  activeSeries,
  dashboardSummary,
  memberCountSeries,
  signupSeries,
  withdrawalSeries,
  type Granularity,
  type MemberLite,
} from "@/features/admin/dashboard-stats";

// recharts 는 무거워 초기 번들에서 빼고 클라이언트에서 지연 로드.
const MetricChart = dynamic(() => import("./metric-chart"), {
  ssr: false,
  loading: () => (
    <div className="h-[280px] rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800" />
  ),
});

type ActiveByGran = Record<Granularity, { bucket: string; users: number }[]>;

const GRAN_LABEL: Record<Granularity, string> = {
  day: "일",
  month: "월",
  year: "연",
};

export function AdminDashboard({
  members,
  active,
}: {
  members: MemberLite[];
  active: ActiveByGran;
}) {
  const [gran, setGran] = useState<Granularity>("month");

  const summary = useMemo(() => dashboardSummary(members), [members]);
  const members$ = useMemo(() => memberCountSeries(members, gran), [members, gran]);
  const signups$ = useMemo(() => signupSeries(members, gran), [members, gran]);
  const withdrawals$ = useMemo(
    () => withdrawalSeries(members, gran),
    [members, gran],
  );
  const active$ = useMemo(() => activeSeries(active[gran]), [active, gran]);

  const todayActive = active.day.length
    ? active.day[active.day.length - 1].users
    : 0;

  return (
    <main className="px-5 py-8 sm:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-100">
            대시보드
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            회원·접속 추이
          </p>
        </div>
        {/* 일/월/연 토글 */}
        <div className="inline-flex rounded-lg border border-zinc-300 bg-white p-0.5 dark:border-zinc-600 dark:bg-zinc-800">
          {(["day", "month", "year"] as Granularity[]).map((g) => (
            <button
              key={g}
              type="button"
              data-testid={`gran-${g}`}
              onClick={() => setGran(g)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-semibold transition",
                gran === g
                  ? "bg-emerald-600 text-white"
                  : "text-zinc-600 hover:text-emerald-700 dark:text-zinc-300",
              )}
            >
              {GRAN_LABEL[g]}통계
            </button>
          ))}
        </div>
      </div>

      {/* 헤드라인 카드 */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="전체 회원수" value={summary.totalMembers} tone="emerald" />
        <StatCard label="누적 가입수" value={summary.totalSignups} tone="sky" />
        <StatCard label="누적 탈퇴수" value={summary.totalWithdrawals} tone="rose" />
        <StatCard label="오늘 접속" value={todayActive} tone="violet" />
      </div>

      {/* 4개 지표 차트 — 모두 선그래프로 통일 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <MetricChart title="회원수" data={members$} color="#10b981" />
        <MetricChart title="회원가입수" data={signups$} color="#0ea5e9" />
        <MetricChart title="회원탈퇴수" data={withdrawals$} color="#f43f5e" />
        <MetricChart title="접속유저수" data={active$} color="#8b5cf6" />
      </div>
    </main>
  );
}

const TONE: Record<string, string> = {
  emerald: "text-emerald-700 dark:text-emerald-400",
  sky: "text-sky-700 dark:text-sky-400",
  rose: "text-rose-700 dark:text-rose-400",
  violet: "text-violet-700 dark:text-violet-400",
};

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
      <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p className={cn("mt-1 text-2xl font-bold", TONE[tone])}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}

