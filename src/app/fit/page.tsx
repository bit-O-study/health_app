import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";

import { getCurrentUser } from "@/lib/supabase/server";
import { getFitAccess } from "@/features/routine/fit-access";
import { loadFitView } from "@/features/routine/fit-data";
import { ALL_SUB_MUSCLES } from "@/features/routine/sub-muscles";
import {
  BODY_PART_LABEL,
  EQUIPMENT_LABELS,
  isEquipmentId,
  type BodyPart,
} from "@/features/routine/exercise-catalog-labels";
import { FitApplyCard, type FitPickView } from "@/features/routine/components/fit-apply-card";
import { FitHeader, FitLocked, styleTextOf } from "@/features/routine/components/fit-shell";
import { FIT_APPLIED_COOKIE, fmtSets, recommendHeadline } from "@/features/routine/fit-view";
import { seoulYmd } from "@/features/routine/data";
import { PART_PREFIX } from "@/features/routine/fit";

export const dynamic = "force-dynamic";
export const metadata = { title: "맞춤 운동" };

const SUB_LABEL = new Map(ALL_SUB_MUSCLES.map((s) => [s.id, s.label]));
const subLabel = (id: string) => SUB_LABEL.get(id) ?? id;

/** 예전 상단 탭 주소(`/fit?tab=…`) → 새 하단 탭 화면. */
const OLD_TAB: Record<string, string> = {
  parts: "/fit/balance",
  balance: "/fit/balance",
  growth: "/fit/growth",
  report: "/fit/report",
};

/**
 * 맞춤 운동 · 오늘 추천(2026-10-06 UI 개편) — 결론 한 줄 → 모자란 곳(세트) → 추천 고르기·담기.
 * 하단 탭: 오늘 추천 · 내 몸 균형 · 홈 · 성장 · 리포트(`apps.ts`).
 * `?part=back` 이면 그 부위를 채우는 운동만 추천한다(내 몸 균형에서 넘어올 때).
 */
export default async function FitRecommendPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; part?: string; more?: string }>;
}) {
  if (!(await getCurrentUser())) redirect("/login?redirect=/fit");
  const { tab, part: rawPart, more } = await searchParams;
  if (tab && OLD_TAB[tab]) redirect(OLD_TAB[tab]);
  const access = await getFitAccess();
  if (!access.visible) notFound();
  const part = (PART_PREFIX as readonly string[]).includes(rawPart ?? "") ? (rawPart as BodyPart) : null;
  const appliedToday = (await cookies()).get(FIT_APPLIED_COOKIE)?.value === seoulYmd();
  const view = await loadFitView({ part, appliedToday, more: more === "1" });
  if (!view) redirect("/login?redirect=/fit");

  const full = access.full;
  const lacking = full ? view.lacking : view.lacking.slice(0, 1);
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

  return (
    <div className="app-page" data-testid="fit-page" data-full={full ? "1" : "0"}>
      <FitHeader
        title="오늘 추천"
        full={full}
        styleText={styleTextOf(view.style)}
        experienceLabel={view.experienceLabel}
        cold={view.daysThisWeek === 0}
      />
      <main className="app-container space-y-3">
        {/* 결론 한 줄 + 그 근거(모자란 곳 막대)를 한 카드에 — 카드 수를 줄인다. */}
        <section className="app-card space-y-3 p-4" data-testid="fit-lacking">
          <div className="flex items-center justify-between gap-2">
            <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100" data-testid="fit-headline">
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
          {lacking.map((r) => (
              <div key={r.sub} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-800 dark:text-zinc-100">{subLabel(r.sub)}</span>
                  <span className="text-xs tabular-nums text-zinc-600 dark:text-zinc-300">
                    {fmtSets(r.stim)} / {fmtSets(r.target)}세트
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-white/[0.08]">
                  <div className="h-full rounded-full bg-danger" style={{ width: `${Math.max(2, Math.min(100, r.pct))}%` }} />
                </div>
              </div>
            ))}
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
      </main>
    </div>
  );
}
