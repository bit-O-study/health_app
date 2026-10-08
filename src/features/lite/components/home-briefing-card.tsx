import Link from "next/link";
import { CalendarHeart, ChevronRight, Lightbulb, Moon, TrendingUp } from "lucide-react";

import { getCatalogExercise } from "@/features/routine/exercise-catalog";
import { primaryBodyPart } from "@/features/routine/exercise-body-parts";
import { growthStories, plateaus, restingParts } from "@/features/routine/fit-insights";
import { homeBriefing, type Briefing } from "@/features/lite/home-briefing";
import { loadRecentRecords } from "@/features/lite/recent-records";
import { getPeriodStartDates } from "@/features/cycle/data-access";
import { predictCycle } from "@/features/cycle/cycle-predict";
import { cycleTrainingTip } from "@/features/cycle/cycle-training";

const name = (id: string) => getCatalogExercise(id)?.name ?? id;
const ICON = { cycle: CalendarHeart, rest: Moon, plateau: Lightbulb, growth: TrendingUp } as const;

/** 홈 · 오늘 한 줄 데이터(라이트). 홈의 다른 조회와 **같이** 시작해 화면이 늦게 밀리지 않게 한다. */
export async function loadHomeBriefing(): Promise<Briefing | null> {
  const [recent, starts] = await Promise.all([
    loadRecentRecords().catch(() => null),
    getPeriodStartDates().catch(() => [] as string[]),
  ]);
  if (!recent) return null;
  const { records, today } = recent;
  return homeBriefing({
    cycle: starts.length ? cycleTrainingTip(predictCycle(starts, today), today) : null,
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
