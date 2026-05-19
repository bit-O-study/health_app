import Link from "next/link";
import { ChevronRight, Dumbbell, Plus } from "lucide-react";

import type { FocusTone } from "@/features/routine/data";
import {
  EQUIPMENT_LABELS,
  getCatalogExercise,
} from "@/features/routine/exercise-catalog";
import { getPlanForFocus } from "@/features/routine/plan";

/** 메인 "오늘의 운동" — 등록된 운동 계획(세트×횟수×무게)을 표시 */
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
      <div className="space-y-2">
        {plan.map((item) => {
          const ex = getCatalogExercise(item.exerciseId);
          const name = ex?.name ?? item.exerciseId;
          return (
            <Link
              key={item.id}
              href={`/exercises/${item.exerciseId}?eq=${item.equipment}`}
              className="group flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <Dumbbell aria-hidden="true" size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-zinc-950">
                  {name}
                  <span className="ml-2 text-xs font-medium text-zinc-500">
                    {EQUIPMENT_LABELS[item.equipment]}
                  </span>
                </h3>
                <p className="mt-0.5 text-sm text-zinc-600">
                  {item.sets}세트 × {item.reps}회
                  {item.weightKg !== null ? ` · ${item.weightKg}kg` : " · 맨몸"}
                </p>
              </div>
              <ChevronRight
                aria-hidden="true"
                className="shrink-0 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-emerald-700"
                size={18}
              />
            </Link>
          );
        })}
      </div>
    </section>
  );
}