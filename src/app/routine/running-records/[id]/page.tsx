import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/supabase/server";
import { getRunSession } from "@/features/running/run-history-data";
import {
  formatRunClock,
  formatRunDate,
  formatRunKcal,
  formatRunKm,
  formatRunPaceShort,
} from "@/features/running/run-records-view";
import { runRouteSvg, runSplits } from "@/features/running/run-route-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "런닝 기록" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function clock(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

/** 런닝 한 건 — 거리·시간·페이스·칼로리, 야외는 경로(선)와 1km 구간, 실내는 경사도. */
export default async function RunningRecordDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await getCurrentUser())) redirect(`/login?redirect=/routine/running-records/${encodeURIComponent(id)}`);
  if (!UUID_RE.test(id)) notFound();
  const run = await getRunSession(id);
  if (!run) notFound();

  const outdoor = run.mode === "outdoor";
  const drawing = outdoor ? runRouteSvg(run.route, 320, 200, 18) : null;
  const splits = outdoor ? runSplits(run.route) : [];
  const fastest = Math.min(...splits.map((s) => s.paceSecPerKm));

  return (
    <div className="app-page">
      <PageHeader title={`${formatRunDate(run.forDate)} ${outdoor ? "야외" : "실내"} 런닝`} back />
      <main className="app-container space-y-4">
        <section aria-label="런닝 요약" className="space-y-1">
          <p className="text-sm text-muted tabular-nums">
            {clock(run.startedAt)} – {clock(run.endedAt)}
          </p>
          <p className="text-[28px] font-bold tracking-tight tabular-nums">
            {formatRunKm(run.distanceM)}
            <span className="ml-1 text-xl font-semibold text-muted">km</span>
          </p>
        </section>

        {drawing ? (
          <svg
            viewBox="0 0 320 200"
            role="img"
            aria-label="달린 경로"
            className="app-card block aspect-[16/10] w-full text-brand"
          >
            <path d={drawing.d} fill="none" stroke="currentColor" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={drawing.start.x} cy={drawing.start.y} r={6} fill="var(--surface-strong)" stroke="currentColor" strokeWidth={3} />
            <circle cx={drawing.end.x} cy={drawing.end.y} r={5.5} fill="currentColor" />
          </svg>
        ) : outdoor ? (
          <p className="app-card p-4 text-sm text-muted">경로가 충분히 저장되지 않아 그릴 수 없어요.</p>
        ) : null}

        <dl className="app-card grid grid-cols-3 divide-x divide-[var(--line)]">
          {[
            ["시간", formatRunClock(run.durationSec)],
            ["평균 페이스", formatRunPaceShort(run.paceSecPerKm)],
            ["칼로리", formatRunKcal(run.caloriesKcal)],
          ].map(([label, value]) => (
            <div key={label} className="px-3 py-3">
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="mt-0.5 text-lg font-bold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>

        {splits.length > 0 ? (
          <section aria-label="1km 구간 페이스" className="app-card space-y-2 p-4">
            <h2 className="app-section-label">1km 구간</h2>
            <ol className="space-y-1.5">
              {splits.map((s, i) => (
                <li key={i} className="grid grid-cols-[3rem_1fr_3.5rem] items-center gap-2 text-sm tabular-nums">
                  <span className="text-muted">{s.distanceM >= 1000 ? `${i + 1}km` : `+${(s.distanceM / 1000).toFixed(1)}km`}</span>
                  <span className="h-2 rounded-full bg-[var(--line)]">
                    <span
                      className={`block h-2 rounded-full ${s.paceSecPerKm === fastest && splits.length > 1 ? "bg-brand" : "bg-brand/40"}`}
                      // 빠를수록 길게 — 막대 길이는 속도(1/페이스)에 비례, 가장 빠른 구간이 100%.
                      style={{ width: `${Math.max(12, Math.round((fastest / s.paceSecPerKm) * 100))}%` }}
                    />
                  </span>
                  <span className="text-right font-semibold">{formatRunPaceShort(s.paceSecPerKm)}</span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {!outdoor || run.averageHeartRate ? (
          <dl className="app-card grid grid-cols-2 gap-3 p-4 text-sm">
            {!outdoor ? (
              <div>
                <dt className="text-xs text-muted">경사</dt>
                <dd className="font-semibold tabular-nums">{run.incline != null ? `${run.incline}%` : "—"}</dd>
              </div>
            ) : null}
            {run.averageHeartRate ? (
              <div>
                <dt className="text-xs text-muted">심박</dt>
                <dd className="font-semibold tabular-nums">
                  평균 {run.averageHeartRate} · 최대 {run.maxHeartRate ?? "—"}
                </dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        <Link href={`/settings/history/${run.forDate}`} className="block py-2 text-center text-sm text-muted underline">
          이날 운동 기록 전체 보기
        </Link>
      </main>
    </div>
  );
}
