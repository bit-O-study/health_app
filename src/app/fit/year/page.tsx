import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Lock } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/supabase/server";
import { getFitAccess } from "@/features/routine/fit-access";
import { getCatalogExercise } from "@/features/routine/exercise-catalog";
import { loadYearReview } from "@/features/lite/year-review-data";
import { ShareMonthImage } from "@/features/calendar/components/share-month-image";

export const dynamic = "force-dynamic";
export const metadata = { title: "1년 돌아보기" };

const CELL = ["bg-zinc-100 dark:bg-white/[0.06]", "bg-brand/25", "bg-brand/45", "bg-brand/70", "bg-brand"] as const;
const name = (id: string) => getCatalogExercise(id)?.name ?? id;

/**
 * 1년 돌아보기(라이트 2단계 혜택 4, 2026-10-02) — 52주 운동 잔디 + 한 해 숫자 + 공유 이미지.
 * 무료(맞춤 운동이 보이는 경우)는 잔디만, 숫자·공유는 라이트.
 */
export default async function YearReviewPage() {
  if (!(await getCurrentUser())) redirect("/login?redirect=/fit/year");
  const access = await getFitAccess();
  if (!access.visible) notFound();
  const r = await loadYearReview();
  if (!r) redirect("/login?redirect=/fit/year");

  const stats: [string, string][] = [
    ["운동한 날", `${r.days}일`],
    ["총 볼륨", `${r.volumeKg.toLocaleString("ko-KR")}kg`],
    ["가장 길게 이어 간 주", `${r.longestWeekStreak}주`],
    ["가장 많이 한 운동", r.topExercise ? `${name(r.topExercise.exerciseId)} ${r.topExercise.days}일` : "—"],
    ["가장 크게 오른 신기록", r.bestPr ? `${name(r.bestPr.exerciseId)} +${r.bestPr.gainKg}kg` : "—"],
  ];

  return (
    <div className="app-page">
      <PageHeader title="1년 돌아보기" back="맞춤 운동" backHref="/fit?tab=report" />
      <main className="app-container space-y-3" data-testid="year-review">
        <section className="app-card space-y-2 p-3">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {r.from.replaceAll("-", ".")} ~ {r.to.replaceAll("-", ".")} · 진할수록 많이 들었어요
          </p>
          {/* 휴대폰 폭엔 53주가 다 안 들어간다 — 오른쪽 끝(최근 주)부터 보이게 rtl 스크롤, 안쪽은 다시 ltr. */}
          <div className="overflow-x-auto [direction:rtl]" data-testid="year-grid">
            <div className="flex w-max gap-[3px] [direction:ltr]">
              {r.weeks.map((col) => (
                <div key={col[0].date} className="flex flex-col gap-[3px]">
                  {col.map((c) => (
                    <span
                      key={c.date}
                      title={c.date}
                      data-level={c.level}
                      className={`h-2.5 w-2.5 rounded-[3px] ${c.future ? "opacity-0" : CELL[c.level]}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        {r.full ? (
          <>
            <section className="app-card space-y-1.5 p-3" data-testid="year-stats">
              {stats.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-2 text-sm text-zinc-800 dark:text-zinc-100">
                  <span>{label}</span>
                  <span className="min-w-0 truncate text-right font-semibold tabular-nums">{value}</span>
                </div>
              ))}
            </section>
            <ShareMonthImage
              month={`${r.to.slice(0, 4)}-year`}
              url="/api/fit/year-image"
              label="1년 기록 이미지"
              testId="share-year-image"
            />
          </>
        ) : (
          <section className="app-card space-y-2 p-4 text-center" data-testid="year-locked">
            <Lock aria-hidden="true" size={20} className="mx-auto text-zinc-400" />
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">한 해 숫자와 공유 이미지는 라이트에서 볼 수 있어요</p>
            <Link href="/settings/subscription" className="inline-block text-sm font-semibold text-brand">
              라이트 알아보기 →
            </Link>
          </section>
        )}
      </main>
    </div>
  );
}
