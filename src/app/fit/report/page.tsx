import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/supabase/server";
import { getFitAccess } from "@/features/routine/fit-access";
import { loadFitGrowth, loadFitHeaderInfo } from "@/features/routine/fit-data";
import { loadLiteReports } from "@/features/lite/reports-data";
import { LiteReportCards } from "@/features/lite/components/lite-reports";
import { loadBodyPhotos } from "@/features/lite/body-photos-data";
import { BodyPhotosCard } from "@/features/lite/components/body-photos-card";
import { BODY_PART_LABEL } from "@/features/routine/exercise-catalog-labels";
import { FitHeader, FitHeadline, FitLocked, styleTextOf } from "@/features/routine/components/fit-shell";
import { deltaMark, partWithEulReul } from "@/features/routine/fit-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "리포트" };

function Delta({ now, prev, unit }: { now: number; prev: number; unit: string }) {
  const d = deltaMark(now, prev);
  if (d.mark === "same") return <span className="text-xs text-zinc-500">지난달과 같음</span>;
  return (
    <span className={`text-xs font-semibold ${d.mark === "up" ? "text-brand" : "text-zinc-500"}`}>
      {d.mark === "up" ? "▲" : "▼"} {d.diff.toLocaleString("ko-KR")}
      {unit}
    </span>
  );
}

/**
 * 맞춤 운동 · 리포트(2026-10-06 UI 개편) — 이번 달 요약(지난달 대비) → 기록 있는 카드만 →
 * 빈 카드는 '이렇게 기록하면 더 볼 수 있어요' 한 장으로 → 올해 돌아보기.
 */
export default async function FitReportPage() {
  if (!(await getCurrentUser())) redirect("/login?redirect=/fit/report");
  const access = await getFitAccess();
  if (!access.visible) notFound();
  const full = access.full;
  const [info, growth, lite, photos] = await Promise.all([
    loadFitHeaderInfo(),
    loadFitGrowth(),
    full ? loadLiteReports() : null,
    full ? loadBodyPhotos(3) : null,
  ]);
  if (!growth) redirect("/login?redirect=/fit/report");
  const m = Number(growth.month.slice(5));
  const t = growth.thisMonth;
  const l = growth.lastMonth;

  return (
    <div className="app-page" data-testid="fit-page" data-full={full ? "1" : "0"}>
      <FitHeader title="리포트" full={full} styleText={styleTextOf(info.style)} experienceLabel={info.experienceLabel} />
      <main className="app-container space-y-3">
        <FitHeadline testId="fit-headline" sub={`${m}월 1일부터 오늘까지`}>
          {t.days === 0 ? `${m}월에는 아직 운동 기록이 없어요` : `${m}월에 ${t.days}일 운동했어요`}
        </FitHeadline>

        {full ? (
          <section className="app-card space-y-2.5 p-4" data-testid="fit-report">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{m}월 리포트</h2>
            {[
              { label: "운동한 날", now: t.days, prev: l.days, unit: "일" },
              { label: "총 볼륨", now: t.volumeKg, prev: l.volumeKg, unit: "kg" },
              { label: "신기록", now: t.prs, prev: l.prs, unit: "개" },
            ].map((r) => (
              <div key={r.label} className="flex items-baseline justify-between gap-2 text-sm text-zinc-800 dark:text-zinc-100">
                <span>{r.label}</span>
                <span className="flex items-baseline gap-2 tabular-nums">
                  <b>
                    {r.now.toLocaleString("ko-KR")}
                    {r.unit}
                  </b>
                  <Delta now={r.now} prev={r.prev} unit={r.unit} />
                </span>
              </div>
            ))}
            {growth.topPart && growth.lackingPart ? (
              <p className="border-t border-[var(--line)] pt-2.5 text-sm text-zinc-700 dark:text-zinc-200" data-testid="fit-report-next">
                이번 달은 <b>{partWithEulReul(growth.topPart as keyof typeof BODY_PART_LABEL)}</b> 가장 많이 했어요. 다음 달은{" "}
                <b>{partWithEulReul(growth.lackingPart as keyof typeof BODY_PART_LABEL)}</b> 더 해 보세요.
              </p>
            ) : null}
          </section>
        ) : null}

        {lite ? <LiteReportCards r={lite} /> : null}
        {photos ? <BodyPhotosCard view={photos} /> : null}
        {!full ? <FitLocked what="월간 요약 · 체성분 · 컨디션 · 식단 리포트" /> : null}

        <Link
          href="/fit/year"
          className="app-card flex items-center justify-between p-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100"
          data-testid="fit-year-link"
        >
          올해 돌아보기 · 운동 잔디
          <span className="text-brand">→</span>
        </Link>
      </main>
    </div>
  );
}
