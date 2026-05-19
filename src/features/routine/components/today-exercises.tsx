import Link from "next/link";
import { Plus } from "lucide-react";

import type { FocusTone } from "@/features/routine/data";
import {
  EQUIPMENT_LABELS,
  getCatalogExercise,
} from "@/features/routine/exercise-catalog";
import { getPlanForFocus } from "@/features/routine/plan";
import {
  TodayPlanList,
  type TodayPlanItem,
} from "@/features/routine/components/today-plan-list";

/** 메인 "오늘의 운동" — 등록된 운동 계획(세트×횟수×무게, 드래그 정렬) */
export async function TodayExercises({ tone }: { tone: FocusTone }) {
  const plan = await getPlanForFocus(tone);

  if (plan.length === 0) {
    return (
      <section className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-center">
        <p className="text-sm leading-6 text-zinc-600">
          오늘 부위에 등록된 운동이 없습니다.
        </p>
        <Link
          href="/plan"
          className="mt-3 inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-500"
        >
          <Plus aria-hidden="true" size={16} />
          운동 등록하기
        </Link>
      </section>
    );
  }

  const items: TodayPlanItem[] = plan.map((item) => ({
    id: item.id,
    exerciseId: item.exerciseId,
    equipment: item.equipment,
    name: getCatalogExercise(item.exerciseId)?.name ?? item.exerciseId,
    equipmentLabel: EQUIPMENT_LABELS[item.equipment],
    sets: item.sets,
    reps: item.reps,
    weightKg: item.weightKg,
  }));

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          오늘 할 운동
        </h2>
        <Link
          href="/plan"
          className="text-xs font-semibold text-emerald-700 transition hover:text-emerald-600"
        >
          편집
        </Link>
      </div>
      <p className="mb-2 text-xs text-zinc-400">
        드래그해서 순서를 바꿀 수 있어요
      </p>
      <TodayPlanList focus={tone} items={items} />
    </section>
  );
}