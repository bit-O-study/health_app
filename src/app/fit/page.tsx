import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ChevronRight } from "lucide-react";

import { getCurrentUser } from "@/lib/supabase/server";
import { getFitAccess } from "@/features/routine/fit-access";
import { loadFitGrowth, loadFitView } from "@/features/routine/fit-data";
import { ALL_SUB_MUSCLES } from "@/features/routine/sub-muscles";
import {
  BODY_PART_LABEL,
  EQUIPMENT_LABELS,
  isEquipmentId,
  type BodyPart,
} from "@/features/routine/exercise-catalog-labels";
import { FitApplyCard, type FitPickView } from "@/features/routine/components/fit-apply-card";
import { FitBalanceRadar } from "@/features/routine/components/fit-balance";
import { FitHeader, FitLocked, styleTextOf } from "@/features/routine/components/fit-shell";
import { FitInsights } from "@/features/routine/components/fit-insights";
import { FitRecovery } from "@/features/routine/components/fit-recovery";
import { pushPull } from "@/features/routine/fit-insights";
import {
  FIT_APPLIED_COOKIE,
  fmtSets,
  growthTile,
  recommendHeadline,
  shortVolume,
  worstBalance,
} from "@/features/routine/fit-view";
import { seoulYmd } from "@/features/routine/data";
import { PART_PREFIX } from "@/features/routine/fit";

export const dynamic = "force-dynamic";
export const metadata = { title: "맞춤 운동" };

const SUB_LABEL = new Map(ALL_SUB_MUSCLES.map((s) => [s.id, s.label]));
const subLabel = (id: string) => SUB_LABEL.get(id) ?? id;

/** 예전 상단 탭 주소(`/fit?tab=…`) → 지금 화면. */
const OLD_TAB: Record<string, string> = {
  parts: "/fit?sheet=balance",
  balance: "/fit?sheet=balance",
  growth: "/fit/report",
  report: "/fit/report",
};

/**
 * 맞춤 운동 · 한눈에(2026-10-07 한 화면 개편) — 탭 4개(추천·균형·성장·리포트)를 한 화면으로.
 * 결론 하나(가장 빈 부위) + 레이더(부위 6개) + 모자란 근육 3줄 → 오늘 추천 → 성장·이번 달 타일.
 * 레이더를 누르면 세부 근육·비율 시트. 하단 탭: 한눈에 · 홈 · 기록(`apps.ts`).
 * 맨 아래 '기록으로 본 나'(2026-10-08) — 성장 기록 · 정체 · 밀기:당기기 · 쉬는 부위.
 * `?part=back` 이면 그 부위를 채우는 운동만 추천한다. 검수보고서: 맞춤 운동 한 화면 개편.
 */
export default async function FitPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; part?: string; more?: string; sheet?: string }>;
}) {
  if (!(await getCurrentUser())) redirect("/login?redirect=/fit");
  const { tab, part: rawPart, more, sheet } = await searchParams;
  if (tab && OLD_TAB[tab]) redirect(OLD_TAB[tab]);
  const access = await getFitAccess();
  if (!access.visible) notFound();
  const part = (PART_PREFIX as readonly string[]).includes(rawPart ?? "") ? (rawPart as BodyPart) : null;
  const appliedToday = (await cookies()).get(FIT_APPLIED_COOKIE)?.value === seoulYmd();
  const [view, growth] = await Promise.all([
    loadFitView({ part, appliedToday, more: more === "1" }),
    loadFitGrowth(),
  ]);
  if (!view) redirect("/login?redirect=/fit");

  const full = access.full;
  const lacking = (full ? view.lacking : view.lacking.slice(0, 1)).slice(0, 3);
  const head = recommendHeadline(view.lacking);
  const picks: FitPickView[] = (full ? view.picks : view.picks.slice(0, 1)).map((p) => ({
    exerciseId: p.exerciseId,
    name: p.name,
    equipment: p.equipment,
    equipmentLabel: isEquipmentId(p.equipment) ? EQUIPMENT_LABELS[p.equipment] : p.equipment,
    prescription: p.prescription
      ? `${p.prescription.sets}세트 × ${p.prescription.reps}회${p.prescription.weightKg ? ` · ${p.prescription.weightKg}kg` : ""}`
      : null,
    fills: p.fills.map((f) => ({ label: subLabel(f.sub), sets: fmtSets(f.add) })),
  }));
  const tile = growth ? growthTile(growth.growth) : null;
  const month = growth ? { m: Number(growth.month.slice(5)), t: growth.thisMonth, l: growth.lastMonth } : null;
  const weekStim = Object.fromEntries(view.rows.map((r) => [r.sub, r.stim]));

  return (
    <div className="app-page" data-testid="fit-page" data-full={full ? "1" : "0"}>
      <FitHeader
        title="맞춤 운동"
        full={full}
        styleText={styleTextOf(view.style)}
        experienceLabel={view.experienceLabel}
        daysThisWeek={view.daysThisWeek}
        cold={view.daysThisWeek === 0}
      />
      <main className="app-container space-y-3">
        {/* 결론 하나 + 그 근거(레이더 · 모자란 근육) 한 카드. */}
        <section className="app-card space-y-2 p-4" data-testid="fit-lacking">
          <div className="flex items-center justify-between gap-2">
            <p className="text-lg font-bold leading-6 text-zinc-900 dark:text-zinc-100" data-testid="fit-headline">
              {part
                ? `${BODY_PART_LABEL[part]} 채우는 운동`
                : view.lacking.length === 0 && view.plannedCount > 0
                  ? "오늘 운동까지 하면 달성!"
                  : head.text}
            </p>
            {part ? (
              <Link href="/fit" className="shrink-0 text-xs font-semibold text-brand" data-testid="fit-part-clear">
                전체 보기
              </Link>
            ) : view.plannedCount > 0 ? (
              // 오늘 할 운동(담은 추천 포함)도 이미 계산에 들어갔다는 표시 — 또 담으라는 게 아니다.
              <Link
                href="/routine"
                className="shrink-0 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand"
                data-testid="fit-planned"
              >
                오늘 운동 {view.plannedCount}개 포함
              </Link>
            ) : null}
          </div>
          <div className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] items-center gap-3">
            {/* `key` — 부위를 고르면(?part=) 다시 그려져 시트가 닫힌다. */}
            <FitBalanceRadar
              key={part ?? "all"}
              parts={view.parts.map((p) => ({ part: p.part as BodyPart, pct: p.pct, status: p.status, stim: p.stim, target: p.target }))}
              rows={view.rows.map((r) => ({
                sub: r.sub,
                label: subLabel(r.sub),
                stim: fmtSets(r.stim),
                target: fmtSets(r.target),
                pct: r.pct,
                status: r.status,
              }))}
              balance={full ? view.balance : []}
              worstId={worstBalance(view.balance)?.id ?? null}
              full={full}
              initialOpen={sheet === "balance"}
            />
            <div className="min-w-0 space-y-2">
              {lacking.length ? (
                lacking.map((r) => (
                  <div key={r.sub} className="space-y-1">
                    <div className="flex items-center justify-between gap-1 text-xs">
                      <span className="truncate text-zinc-800 dark:text-zinc-100">{subLabel(r.sub)}</span>
                      <span className="shrink-0 tabular-nums text-zinc-500 dark:text-zinc-400">
                        {fmtSets(r.stim)}/{fmtSets(r.target)}세트
                      </span>
                    </div>
                    <div className="h-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-white/[0.08]">
                      <div className="h-full rounded-full bg-danger" style={{ width: `${Math.max(3, Math.min(100, r.pct))}%` }} />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">모자란 근육이 없어요</p>
              )}
              <p className="text-xs text-zinc-400">점선 = 이번 주 목표 · 그림을 누르면 자세히</p>
            </div>
          </div>
        </section>

        {picks.length ? (
          <FitApplyCard picks={picks} canReplace={full} />
        ) : view.plannedCount > 0 || view.todayFull ? (
          // 오늘 운동이 찼거나 오늘 추천을 이미 담았다 — 또 담으라고 하지 않고 운동하러 보낸다.
          <section className="app-card space-y-2 p-4 text-center" data-testid="fit-today-done">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {appliedToday ? "오늘 추천을 담았어요" : "오늘 운동은 충분해요"}
            </p>
            <Link
              href="/routine"
              className="app-press flex h-11 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white dark:text-zinc-950"
              data-testid="fit-go-today"
            >
              오늘 운동 하러 가기
            </Link>
            {full ? (
              <Link href="/fit?more=1" className="inline-block text-xs font-semibold text-zinc-500 dark:text-zinc-400" data-testid="fit-more">
                더 추천 받기
              </Link>
            ) : null}
          </section>
        ) : null}
        {!full ? <FitLocked what="추천 3개 · 고르기 · 바꾸기" /> : null}

        {/* 부위별 회복(2026-10-08, 라이트) — 오늘 어디를 해도 되는지. */}
        {full ? <FitRecovery rows={view.recovery} /> : null}

        {/* 늘고 있는 것 — 성장 · 이번 달. 누르면 기록 탭. */}
        <div className="grid grid-cols-2 gap-3" data-testid="fit-tiles">
          <Link href="/fit/report" className="app-card app-press min-w-0 space-y-0.5 p-3.5" data-testid="fit-tile-growth">
            <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
              성장{tile ? ` · ${tile.name}` : ""}
            </span>
            {tile ? (
              <>
                <span className="flex items-center gap-2">
                  <b className="text-base tabular-nums text-zinc-900 dark:text-zinc-100">{tile.kg}kg</b>
                  <Spark values={tile.points} />
                </span>
                <span className={`block text-xs font-semibold ${tile.stalled ? "text-warn" : "text-brand"}`}>
                  {tile.stalled ? "정체 중" : tile.diffKg && tile.diffKg > 0 ? `▲ ${tile.diffKg}kg` : "기록 더 필요"}
                </span>
              </>
            ) : (
              <span className="block text-sm font-semibold text-zinc-700 dark:text-zinc-200">무게를 기록해 보세요</span>
            )}
          </Link>
          <Link href="/fit/report" className="app-card app-press min-w-0 space-y-0.5 p-3.5" data-testid="fit-tile-month">
            <span className="flex items-center text-xs text-zinc-500 dark:text-zinc-400">
              {month ? `${month.m}월` : "이번 달"}
              <ChevronRight aria-hidden="true" size={13} className="ml-auto" />
            </span>
            {month ? (
              <>
                <b className="block text-base tabular-nums text-zinc-900 dark:text-zinc-100">
                  {month.t.days}일 · {shortVolume(month.t.volumeKg)}
                </b>
                <span className="block text-xs font-semibold tabular-nums text-zinc-500 dark:text-zinc-400">
                  {month.t.volumeKg > month.l.volumeKg ? (
                    <span className="text-brand">▲ {shortVolume(month.t.volumeKg - month.l.volumeKg)}</span>
                  ) : (
                    `지난달 이맘때 ${month.l.days}일`
                  )}
                </span>
              </>
            ) : null}
          </Link>
        </div>

        {growth ? (
          <FitInsights
            stories={growth.insights.stories}
            plateaus={growth.insights.plateaus}
            pushPull={pushPull(weekStim)}
            resting={growth.insights.resting}
            full={full}
          />
        ) : null}
      </main>
    </div>
  );
}

/** 작은 추이 선 — 끝점 강조. 점 하나면 가운데 점만. */
function Spark({ values }: { values: number[] }) {
  if (values.length === 0) return null;
  const W = 56;
  const H = 20;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const x = (i: number) => (values.length === 1 ? W / 2 : 2 + ((W - 4) * i) / (values.length - 1));
  const y = (v: number) => (hi === lo ? H / 2 : H - 3 - ((H - 6) * (v - lo)) / (hi - lo));
  const last = values.length - 1;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-5 w-14 shrink-0" aria-hidden="true">
      <polyline points={values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ")} fill="none" className="stroke-brand" strokeWidth="1.8" />
      <circle cx={x(last)} cy={y(values[last])} r="2.4" className="fill-brand" />
    </svg>
  );
}
