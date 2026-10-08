import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { BODY_PART_LABEL, type BodyPart } from "@/features/routine/exercise-catalog-labels";
import { fmtSets } from "@/features/routine/fit-view";
import type { GrowthStory, Plateau, PushPull, RestingPart } from "@/features/routine/fit-insights";

const md = (ymd: string) => `${Number(ymd.slice(5, 7))}/${Number(ymd.slice(8, 10))}`;
const kg = (x: number) => `${Math.round(x * 10) / 10}kg`;
/** "+67%" — 처음 무게 대비. */
const growthPct = (s: { fromKg: number; toKg: number }) => `+${Math.round(((s.toKg - s.fromKg) / s.fromKg) * 100)}%`;
/** "2달" · "3주" — 처음 한 날부터 최고 기록까지. */
function monthsText(from: string, to: string): string {
  const d = Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
  return d >= 45 ? `${Math.round(d / 30)}달` : `${Math.max(1, Math.round(d / 7))}주`;
}

/**
 * 맞춤 운동 · 기록으로 본 나(2026-10-08) — 쌓인 기록으로 본 성장 · 정체 · 밀기:당기기 · 쉬는 부위.
 * 라이트(full)는 넷 다, 맛보기는 성장 기록만. 보여 줄 게 하나도 없으면 카드를 안 그린다.
 */
export function FitInsights({
  stories,
  plateaus,
  pushPull,
  resting,
  full,
}: {
  stories: (GrowthStory & { name: string })[];
  plateaus: (Plateau & { name: string })[];
  pushPull: PushPull;
  resting: RestingPart[];
  full: boolean;
}) {
  const showPlateaus = full && plateaus.length > 0;
  const showPushPull = full && pushPull.push + pushPull.pull > 0;
  const showResting = full && resting.length > 0;
  if (stories.length === 0 && !showPlateaus && !showPushPull && !showResting) return null;
  const total = pushPull.push + pushPull.pull;

  return (
    <section className="app-card divide-y divide-zinc-100 px-4 dark:divide-white/[0.06]" data-testid="fit-insights">
      <h2 className="py-3 text-sm font-bold text-zinc-900 dark:text-zinc-100">기록으로 본 나</h2>

      {stories.length > 0 ? (
        <div className="space-y-1.5 py-3" data-testid="fit-insight-growth">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">이만큼 늘었어요</p>
          {stories.map((s) => (
            <div key={s.exerciseId} className="space-y-0.5">
              <div className="flex items-baseline gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate text-zinc-800 dark:text-zinc-100">{s.name}</span>
                <span className="shrink-0 tabular-nums text-zinc-500 dark:text-zinc-400">
                  {kg(s.fromKg)} → <b className="text-zinc-900 dark:text-zinc-100">{kg(s.toKg)}</b>
                </span>
                <span className="w-16 shrink-0 text-right text-xs font-semibold tabular-nums text-brand">▲ {kg(s.toKg - s.fromKg)}</span>
              </div>
              <p className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400" data-testid={`fit-insight-growth-detail-${s.exerciseId}`}>
                {md(s.fromDate)} → {md(s.toDate)} · {growthPct(s)} · {monthsText(s.fromDate, s.toDate)}
              </p>
            </div>
          ))}
          <p className="text-xs text-zinc-400">처음 한 날 무게 → 최근 4주 최고 무게</p>
        </div>
      ) : null}

      {showPlateaus ? (
        <div className="space-y-2 py-3" data-testid="fit-insight-plateau">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">멈춰 있어요</p>
          {plateaus.map((p) => (
            <div key={p.exerciseId} className="space-y-0.5">
              <p className="text-sm text-zinc-800 dark:text-zinc-100">
                <b>{p.name}</b>{" "}
                <span className={`font-semibold ${p.kind === "decline" ? "text-danger" : "text-warn"}`}>
                  {p.kind === "decline" ? "최근 떨어지는 중" : `${p.weeks}주째 그대로`}
                </span>
              </p>
              <p className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                {md(p.sinceDate)} 최고(예상 최대) {p.bestOneRmKg}kg → 최근 {p.recentOneRmKg}kg(
                {Math.round((p.recentOneRmKg / Math.max(1, p.bestOneRmKg)) * 100)}%) · 그 뒤 {p.sessions}번
              </p>
              <p className="text-xs text-zinc-600 dark:text-zinc-300">{p.advice}</p>
            </div>
          ))}
        </div>
      ) : null}

      {showPushPull ? (
        <div className="space-y-1.5 py-3" data-testid="fit-insight-pushpull">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">밀기 : 당기기 · 지난 7일</p>
            <p className="text-sm tabular-nums text-zinc-800 dark:text-zinc-100">
              {fmtSets(pushPull.push)} : {fmtSets(pushPull.pull)}세트
              {pushPull.ratio !== null ? <b className={pushPull.lean ? "text-warn" : "text-brand"}> · {pushPull.ratio} : 1</b> : null}
            </p>
          </div>
          <div className="flex h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-white/[0.08]" aria-hidden="true">
            <div className={pushPull.lean === "push" ? "bg-warn" : "bg-brand"} style={{ width: `${(pushPull.push / total) * 100}%` }} />
            <div className="bg-brand/40" style={{ width: `${(pushPull.pull / total) * 100}%` }} />
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-300">
            {pushPull.lean === "push" ? (
              <>
                미는 운동이 많아 어깨 앞쪽이 말리기 쉬워요. 당기기를 <b>{pushPull.needSets}세트</b> 더 하면 1.5 : 1 안으로 들어와요.{" "}
                <Link href="/fit?part=back" className="font-semibold text-brand" data-testid="fit-insight-pull-link">당기는 운동 추천</Link>
              </>
            ) : pushPull.lean === "pull" ? (
              `당기는 운동이 훨씬 많아요. 가슴·어깨 미는 운동을 ${pushPull.needSets}세트 더 하면 균형이 맞아요.`
            ) : (
              "균형이 좋아요."
            )}
          </p>
        </div>
      ) : null}

      {showResting ? (
        <div className="space-y-1.5 py-3" data-testid="fit-insight-resting">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">쉬고 있는 부위</p>
          <div className="flex flex-wrap gap-1.5">
            {resting.map((r) => (
              <Link
                key={r.part}
                href={`/fit?part=${r.part}`}
                className="app-press inline-flex items-center gap-0.5 rounded-full bg-danger/10 px-2.5 py-1 text-xs font-semibold text-danger"
              >
                {BODY_PART_LABEL[r.part as BodyPart]} {r.days === null ? "4달 넘게" : `${r.days}일째`}
                <ChevronRight aria-hidden="true" size={12} />
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
