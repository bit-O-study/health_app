import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { getUserProfile } from "@/features/profile/data-access";
import { getUserRoutine } from "@/features/routine/data-access";
import { DAY_BLOCKS } from "@/features/routine/data";
import { ALL_FOCUSES } from "@/features/routine/exercise-catalog";
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

  const focuses = await Promise.all(
    ALL_FOCUSES.map(async (focus) => {
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