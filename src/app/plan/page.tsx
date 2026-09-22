import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/supabase/server";
import { getUserProfile } from "@/features/profile/data-access";
import { getCurrentGym } from "@/features/gym/gym-data-access";
import { getMyGroups } from "@/features/groups/data-access";
import { getUserRoutine } from "@/features/routine/data-access";
import { routineDaySlots } from "@/features/routine/data";
import { getPlanForDay } from "@/features/routine/plan";
import { getConditioningForFocus } from "@/features/routine/conditioning";
import { ensureDayIndexBackfilled } from "@/features/routine/day-index-migration";
import { PlanEditor } from "@/features/routine/components/plan-editor";

export const dynamic = "force-dynamic";

export default async function PlanPage() {
  const [user, profile, routine, gym, myGroups] = await Promise.all([
    getCurrentUser(),
    getUserProfile(),
    getUserRoutine(),
    getCurrentGym(),
    getMyGroups(),
  ]);

  if (!profile) redirect("/onboarding");
  if (!routine) redirect("/settings/routine");
  if (user && routine && !routine.dayIndexMigrated) {
    const backfilled = await ensureDayIndexBackfilled(user.id);
    if (backfilled) {
      // 백필 claim/update가 routine revision을 올리므로 같은 렌더의 오래된
      // updatedAt을 편집기에 넘기지 않는다.
      redirect("/plan");
    }
  }
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

  // 공통 머리글 + '루틴 변경'은 큰 제목 줄 오른쪽 작은 알약(2026-09-16 8단계) — 설명 문장은 뺐다.
  return (
    <div className="app-page">
    <PageHeader title="운동 등록" back="운동" backHref="/routine">
      {/* '루틴 변경' — 메인 헤더에서 이 화면(운동 편집) 안으로 이동. */}
      <Link
        className="app-press inline-flex h-8 items-center gap-0.5 whitespace-nowrap rounded-full bg-zinc-100 px-3 text-sm font-semibold text-brand dark:bg-white/[0.08]"
        href="/settings/routine"
      >
        루틴 변경
        <ChevronRight aria-hidden="true" size={15} />
      </Link>
    </PageHeader>
    <main className="app-container">
      <nav aria-label="루틴 도구" className="mb-5 flex flex-wrap gap-2 text-sm font-semibold">
        <Link href="/plan/muscle" className="rounded-xl border border-zinc-200 px-3 py-2 dark:border-zinc-700">근육별 운동 선택</Link>
        <Link href="/plan/today" className="rounded-xl border border-zinc-200 px-3 py-2 dark:border-zinc-700">오늘만 운동 변경</Link>
        <Link href="/settings/routine" className="rounded-xl border border-zinc-200 px-3 py-2 dark:border-zinc-700">루틴 설정 · 프리셋</Link>
      </nav>

      <PlanEditor
        focuses={focuses}
        customWeek={
          routine.variantId === "custom" ? routine.customWeekSnapshot : null
        }
        routineUpdatedAt={routine.updatedAt}
        gender={profile.gender}
        experience={profile.experience}
        bodyType={profile.bodyType}
        weightKg={profile.weightKg}
        gymEquipment={gymEquipment}
        lockWeightReps={profile.lockWeightReps}
        myGroups={myGroups.map((group) => ({ id: group.id, name: group.name }))}
      />
    </main>
    </div>
  );
}
