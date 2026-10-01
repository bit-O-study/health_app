import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Lock } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/supabase/server";
import { getFitAccess } from "@/features/routine/fit-access";
import { loadFitView } from "@/features/routine/fit-data";
import { SUB_STATUS_LABEL, type SubStatus } from "@/features/routine/fit";
import { ALL_SUB_MUSCLES } from "@/features/routine/sub-muscles";
import { BODY_PART_LABEL } from "@/features/routine/exercise-catalog-labels";
import { FitApplyCard, type FitPickView } from "@/features/routine/components/fit-apply-card";

export const dynamic = "force-dynamic";
export const metadata = { title: "맞춤 운동" };

const SUB_LABEL = new Map(ALL_SUB_MUSCLES.map((s) => [s.id, s.label]));
const subLabel = (id: string) => SUB_LABEL.get(id) ?? id;

const TABS = [
  { id: "recommend", label: "추천" },
  { id: "parts", label: "부위" },
  { id: "balance", label: "균형" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const BAR: Record<SubStatus, string> = {
  none: "bg-zinc-300 dark:bg-zinc-600",
  low: "bg-danger",
  some: "bg-brand/50",
  ok: "bg-brand",
  high: "bg-sky-500",
};
const CHIP: Record<SubStatus, string> = {
  none: "bg-zinc-100 text-zinc-600 dark:bg-white/[0.08] dark:text-zinc-300",
  low: "bg-danger/10 text-danger",
  some: "bg-brand-soft text-brand",
  ok: "bg-brand-soft text-brand",
  high: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
};

function Bar({ pct, status }: { pct: number; status: SubStatus }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-white/[0.08]">
      <div className={`h-full rounded-full ${BAR[status]}`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}

function Locked({ what }: { what: string }) {
  return (
    <section className="app-card space-y-2 p-4 text-center" data-testid="fit-locked">
      <Lock aria-hidden="true" size={20} className="mx-auto text-zinc-400" />
      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{what}은 라이트에서 볼 수 있어요</p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">세부 부위 25개 · 맞춤 추천 전부 · 균형 · 월 990원</p>
      <Link href="/settings/subscription" className="inline-block text-sm font-semibold text-brand">
        라이트 알아보기 →
      </Link>
    </section>
  );
}

/**
 * 맞춤 운동 앱(라이트 990원, 2026-10-01) — 추천 · 부위 · 균형.
 * 내 기록(지난 7일) + 가입 설문(성별·경력)으로 세부 근육 25개를 목표 비율과 비교해, 모자란 곳을
 * 채우는 운동을 고른다. AI 없음(원가 0원). 적용은 **오늘만 운동 변경으로만**(사용자 결정).
 */
export default async function FitPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  if (!(await getCurrentUser())) redirect("/login?redirect=/fit");
  const access = await getFitAccess();
  if (!access.visible) notFound();
  const view = await loadFitView();
  if (!view) redirect("/login?redirect=/fit");

  const { tab: rawTab } = await searchParams;
  const tab: TabId = TABS.some((t) => t.id === rawTab) ? (rawTab as TabId) : "recommend";
  const full = access.full;
  const picks: FitPickView[] = (full ? view.picks : view.picks.slice(0, 1)).map((p) => ({
    exerciseId: p.exerciseId,
    name: p.name,
    equipment: p.equipment,
    fills: p.fills.map((f) => ({ label: subLabel(f.sub), add: f.add })),
  }));
  const lacking = full ? view.lacking : view.lacking.slice(0, 1);

  return (
    <div className="app-page">
      <PageHeader branded title="맞춤 운동" back />
      <main className="app-container space-y-3" data-testid="fit-page" data-full={full ? "1" : "0"}>
        <div className="flex items-center justify-between gap-2 px-1 text-xs text-zinc-500 dark:text-zinc-400">
          <span>
            {view.style === "female" ? "여성 · 하체·둔근 중심" : view.style === "male" ? "남성 · V자" : "고르게"} ·{" "}
            {view.experienceLabel}
          </span>
          <span className={`rounded-full px-2 py-0.5 font-semibold ${full ? "bg-brand-soft text-brand" : "bg-zinc-100 dark:bg-white/[0.08]"}`}>
            {full ? "라이트" : "무료 맛보기"}
          </span>
        </div>

        <nav aria-label="맞춤 운동 탭" className="flex gap-1.5">
          {TABS.map((t) => (
            <Link
              key={t.id}
              href={`/fit?tab=${t.id}`}
              aria-current={tab === t.id ? "page" : undefined}
              className={`h-9 flex-1 rounded-full text-center text-sm font-semibold leading-9 ${
                tab === t.id ? "bg-brand text-white dark:text-zinc-950" : "bg-zinc-100 text-zinc-700 dark:bg-white/[0.08] dark:text-zinc-200"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        {view.daysThisWeek === 0 ? (
          <p className="app-card p-3 text-xs text-zinc-600 dark:text-zinc-300" data-testid="fit-cold">
            이번 주 기록이 아직 없어요. 가입할 때 고른 성별·경력의 목표 비율로 추천해요 — 운동할수록 내 기록에 맞춰져요.
          </p>
        ) : null}

        {tab === "recommend" ? (
          <>
            <section className="app-card space-y-2 p-3" data-testid="fit-lacking">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">이번 주 모자란 곳</h2>
              {lacking.length ? (
                lacking.map((r) => (
                  <div key={r.sub} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-800 dark:text-zinc-100">{subLabel(r.sub)}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${CHIP[r.status]}`}>목표의 {r.pct}%</span>
                    </div>
                    <Bar pct={r.pct} status={r.status} />
                  </div>
                ))
              ) : (
                <p className="text-sm text-zinc-600 dark:text-zinc-300">이번 주 목표를 모두 채웠어요! 오늘은 쉬거나 가볍게 해도 좋아요.</p>
              )}
            </section>
            {picks.length ? <FitApplyCard picks={picks} /> : null}
            {!full ? <Locked what="모자란 곳 전부와 추천 3개" /> : null}
          </>
        ) : null}

        {tab === "parts" ? (
          full ? (
            view.parts.map((p) => (
              <section key={p.part} className="app-card space-y-2 p-3" data-testid={`fit-part-${p.part}`}>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{BODY_PART_LABEL[p.part]}</h2>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${CHIP[p.status]}`}>
                    {SUB_STATUS_LABEL[p.status]} · {p.pct}%
                  </span>
                </div>
                {view.rows
                  .filter((r) => r.sub.startsWith(`${p.part}-`))
                  .map((r) => (
                    <div key={r.sub} className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-zinc-700 dark:text-zinc-200">
                        <span>{subLabel(r.sub)}</span>
                        <span className="tabular-nums">
                          {r.stim} / {r.target} 세트
                        </span>
                      </div>
                      <Bar pct={r.pct} status={r.status} />
                    </div>
                  ))}
              </section>
            ))
          ) : (
            <>
              <section className="app-card space-y-2 p-3" data-testid="fit-parts-free">
                {view.parts.map((p) => (
                  <div key={p.part} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{BODY_PART_LABEL[p.part]}</span>
                      <span className="text-xs tabular-nums text-zinc-500">{p.pct}%</span>
                    </div>
                    <Bar pct={p.pct} status={p.status} />
                  </div>
                ))}
              </section>
              <Locked what="세부 부위 25개" />
            </>
          )
        ) : null}

        {tab === "balance" ? (
          full ? (
            view.balance.map((b) => (
              <section key={b.id} className="app-card space-y-2 p-3" data-testid={`fit-balance-${b.id}`}>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{b.label}</h2>
                {b.parts.map((p) => (
                  <div key={p.label} className="flex items-center justify-between text-xs text-zinc-700 dark:text-zinc-200">
                    <span>{p.label}</span>
                    <span className="tabular-nums">
                      지금 {p.now}% · 목표 {p.goal}%
                    </span>
                  </div>
                ))}
                {b.hint ? <p className="text-xs font-semibold text-danger">{b.hint}</p> : null}
              </section>
            ))
          ) : (
            <Locked what="내 몸 균형" />
          )
        ) : null}

        <p className="px-1 text-xs text-zinc-400 dark:text-zinc-500">
          점수는 운동별 세부 근육 자극(초안)과 목표 비율로 계산해요. 지난 7일 기록 기준.
        </p>
      </main>
    </div>
  );
}
