import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ChevronLeft } from "lucide-react";

import { getCurrentUser } from "@/lib/supabase/server";
import { getUserProfile } from "@/features/profile/data-access";
import { getCurrentGym } from "@/features/gym/gym-data-access";
import { getUserRoutine } from "@/features/routine/data-access";
import { routineDaySlots } from "@/features/routine/data";
import { getPlanForDay } from "@/features/routine/plan";
import { getConditioningForFocus } from "@/features/routine/conditioning";
import { ensureDayIndexBackfilled } from "@/features/routine/day-index-migration";
import { PlanEditor } from "@/features/routine/components/plan-editor";

export const dynamic = "force-dynamic";

export default async function PlanPage() {
  const [user, profile, routine, gym] = await Promise.all([
    getCurrentUser(),
    getUserProfile(),
    getUserRoutine(),
    getCurrentGym(),
  ]);

  if (!profile) redirect("/onboarding");
  if (!routine) redirect("/settings/routine");
  if (user && routine && !routine.dayIndexMigrated)
    await ensureDayIndexBackfilled(user.id);
  const gymEquipment = gym?.equipmentIds ?? null;

  // 루틴을 일차별 부위 슬롯으로 펼친다. 같은 부위가 여러 일차에 나오면 각각
  // 독립 섹션으로 편집한다(일차별 독립). 워밍업/마무리는 부위 단위라 그 부위
  // 첫 섹션에서만 노출한다(중복 방지).
  const slots = routineDaySlots(
    routine.splits,
    routine.variantId,
    routine.customWeek,
  );
  const seenFocus = new Set<string>();
  const slotMeta = slots.map((s) => {
    const showConditioning = !seenFocus.has(s.focus);
    seenFocus.add(s.focus);
    return { ...s, showConditioning };
  });

  const distinctFocuses = [...new Set(slots.map((s) => s.focus))];
  const condEntries = await Promise.all(
    distinctFocuses.map(
      async (f) => [f, await getConditioningForFocus(f)] as const,
    ),
  );
  const condByFocus = new Map(condEntries);

  const focuses = await Promise.all(
    slotMeta.map(async (s) => {
      const items = await getPlanForDay(s.dayIndex, s.focus);
      const cond = condByFocus.get(s.focus)!;
      return {
        key: `${s.dayIndex}:${s.focus}`,
        dayIndex: s.dayIndex,
        focus: s.focus,
        blockIds: s.blockIds,
        isSide: s.isSide,
        label: s.label,
        items,
        warmup: cond.warmup,
        cooldown: cond.cooldown,
        showConditioning: s.showConditioning,
      };
    }),
  );

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10 sm:px-8">
      <div className="flex items-center justify-between gap-2">
        <Link
          className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-200"
          href="/routine"
        >
          <ChevronLeft aria-hidden="true" size={16} />
          메인으로
        </Link>
        {/* '루틴 변경' — 메인 헤더에서 이 화면(운동 편집) 안으로 이동. */}
        <Link
          className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-700 transition hover:border-emerald-300 hover:bg-emerald-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30"
          href="/settings/routine?from=plan"
        >
          루틴 변경
          <ArrowRight aria-hidden="true" size={15} />
        </Link>
      </div>

      <div className="mt-6 mb-6 space-y-1">
        <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-100">
          운동 등록
        </h1>
        <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          체형·성별·경력에 맞춘 추천으로 한 번에 등록하거나, 부위별로 직접
          운동을 추가하세요. 메인 “오늘의 운동”에 등록한 운동이 표시됩니다.
        </p>
      </div>

      <PlanEditor
        focuses={focuses}
        gender={profile.gender}
        experience={profile.experience}
        bodyType={profile.bodyType}
        weightKg={profile.weightKg}
        gymEquipment={gymEquipment}
        lockWeightReps={profile.lockWeightReps}
      />
    </main>
  );
}
