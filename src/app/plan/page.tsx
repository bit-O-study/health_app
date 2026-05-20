import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { getUserProfile } from "@/features/profile/data-access";
import { getUserRoutine } from "@/features/routine/data-access";
import { DAY_BLOCKS, resolveRoutine } from "@/features/routine/data";
import type { FocusKey } from "@/features/routine/exercise-catalog";
import { getPlanForFocus } from "@/features/routine/plan";
import { getConditioningForFocus } from "@/features/routine/conditioning";
import { PlanEditor } from "@/features/routine/components/plan-editor";

export const dynamic = "force-dynamic";

export default async function PlanPage() {
  const [profile, routine] = await Promise.all([
    getUserProfile(),
    getUserRoutine(),
  ]);

  if (!profile) redirect("/onboarding");
  if (!routine) redirect("/settings/routine");

  // 현재 선택된 루틴의 주간 계획에서 등장하는 부위만 (휴식 제외, 첫 등장 순).
  // 멀티 부위 일자는 DayPlan.tones 에 모든 부위가 들어있어 그것까지 모두 포함.
  const { variant } = resolveRoutine(
    routine.splits,
    routine.variantId,
    routine.customWeek,
  );
  const seen = new Set<FocusKey>();
  const usedFocuses: FocusKey[] = [];
  for (const day of variant.week) {
    const dayTones = day.tones ?? [day.tone];
    for (const t of dayTones) {
      if (t === "rest") continue;
      const f = t as FocusKey;
      if (seen.has(f)) continue;
      seen.add(f);
      usedFocuses.push(f);
    }
  }

  const focuses = await Promise.all(
    usedFocuses.map(async (focus) => {
      const [items, conditioning] = await Promise.all([
        getPlanForFocus(focus),
        getConditioningForFocus(focus),
      ]);
      return {
        focus,
        label: DAY_BLOCKS[focus].label,
        items,
        warmup: conditioning.warmup,
        cooldown: conditioning.cooldown,
      };
    }),
  );

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10 sm:px-8">
      <Link
        className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 transition hover:text-zinc-800"
        href="/"
      >
        <ChevronLeft aria-hidden="true" size={16} />
        메인으로
      </Link>

      <div className="mt-6 mb-6 space-y-1">
        <h1 className="text-2xl font-bold text-zinc-950">운동 등록</h1>
        <p className="text-sm leading-6 text-zinc-600">
          체형·성별·경력에 맞춘 추천으로 한 번에 등록하거나, 부위별로 직접
          운동을 추가하세요. 메인 “오늘의 운동”에 등록한 운동이 표시됩니다.
        </p>
      </div>

      <PlanEditor gender={profile.gender} focuses={focuses} />
    </main>
  );
}