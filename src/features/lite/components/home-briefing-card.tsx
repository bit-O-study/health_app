import Link from "next/link";
import { CalendarHeart, CheckCircle2, ChevronRight, Lightbulb, Moon, Sparkles, TrendingUp } from "lucide-react";

import { getCatalogExercise } from "@/features/routine/exercise-catalog";
import { primaryBodyPart } from "@/features/routine/exercise-body-parts";
import { growthStories, plateaus, recoveryByPart, recoveryInputs, restingParts } from "@/features/routine/fit-insights";
import { makeStimulusOf } from "@/features/routine/fit-data";
import { getTodayCheckin } from "@/features/routine/checkin-data";
import { whenText } from "@/features/routine/fit-view";
import { sessionReport } from "@/features/lite/session-report";
import type { BodyPart } from "@/features/routine/exercise-catalog-labels";
import { homeBriefing, type Briefing } from "@/features/lite/home-briefing";
import { loadRecentRecords } from "@/features/lite/recent-records";
import { getPeriodStartDates } from "@/features/cycle/data-access";
import { predictCycle } from "@/features/cycle/cycle-predict";
import { cycleTrainingTip } from "@/features/cycle/cycle-training";

const name = (id: string) => getCatalogExercise(id)?.name ?? id;
const ICON = { cycle: CalendarHeart, today: CheckCircle2, rest: Moon, plateau: Lightbulb, ready: Sparkles, growth: TrendingUp } as const;

/** 홈 · 오늘 한 줄 데이터(라이트). 홈의 다른 조회와 **같이** 시작해 화면이 늦게 밀리지 않게 한다. */
export async function loadHomeBriefing(): Promise<Briefing | null> {
  const [recent, starts, checkin] = await Promise.all([
    loadRecentRecords().catch(() => null),
    getPeriodStartDates().catch(() => [] as string[]),
    getTodayCheckin().catch(() => null),
  ]);
  if (!recent) return null;
  const { records, today } = recent;
  const now = new Date();
  const stimulusOf = makeStimulusOf();
  const recovery = recoveryByPart(recoveryInputs(records, now), stimulusOf, now, checkin);
  const session = sessionReport(records, today, stimulusOf);
  const mainRecovery = session?.mainPart ? recovery.find((r) => r.part === session.mainPart) : null;
  // 다 회복된 부위 중 가장 오래 쉰 곳(한 번이라도 한 부위만).
  const recovered = new Set(recovery.filter((r) => r.pct >= 100).map((r) => r.part));
  const ready = restingParts(records, primaryBodyPart, today, 0)
    .filter((r) => r.days !== null && recovered.has(r.part))
    .sort((a, b) => (b.days ?? 0) - (a.days ?? 0))[0];
  return homeBriefing({
    cycle: starts.length ? cycleTrainingTip(predictCycle(starts, today), today) : null,
    today: session
      ? {
          part: (session.mainPart as BodyPart | null) ?? null,
          sets: session.sets,
          readyText: mainRecovery && mainRecovery.hoursLeft > 0 ? whenText(new Date(now.getTime() + mainRecovery.hoursLeft * 3_600_000).toISOString()) : null,
        }
      : null,
    ready: ready ? { part: ready.part as BodyPart, days: ready.days ?? 0 } : null,
    resting: restingParts(records, primaryBodyPart, today),
    plateaus: plateaus(records, today).map((p) => ({ ...p, name: name(p.exerciseId) })),
    stories: growthStories(records, today).map((g) => ({ ...g, name: name(g.exerciseId) })),
  });
}

export function HomeBriefingCard({ briefing: b }: { briefing: Briefing }) {
  const Icon = ICON[b.kind];
  return (
    <Link href={b.href} className="app-card app-press flex items-center gap-3 p-4" data-testid="home-briefing" data-kind={b.kind}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
        <Icon aria-hidden="true" size={17} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-zinc-900 dark:text-zinc-100">{b.text}</span>
        <span className="block text-xs text-zinc-500 dark:text-zinc-400">{b.sub}</span>
      </span>
      <ChevronRight aria-hidden="true" size={16} className="shrink-0 text-zinc-300 dark:text-zinc-600" />
    </Link>
  );
}
