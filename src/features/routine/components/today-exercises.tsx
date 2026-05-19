import Link from "next/link";
import { ChevronRight, Dumbbell } from "lucide-react";

import type { FocusTone } from "@/features/routine/data";
import { exercisesForFocus } from "@/features/routine/exercise-catalog";

export function TodayExercises({ tone }: { tone: FocusTone }) {
  const exercises = exercisesForFocus(tone);
  if (exercises.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
        오늘 할 운동
      </h2>
      <div className="space-y-2">
        {exercises.map((ex) => (
          <Link
            key={ex.id}
            href={`/exercises/${ex.id}`}
            className="group flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <Dumbbell aria-hidden="true" size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-zinc-950">{ex.name}</h3>
              <p className="mt-0.5 text-xs text-zinc-500">{ex.target}</p>
            </div>
            <ChevronRight
              aria-hidden="true"
              className="shrink-0 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-emerald-700"
              size={18}
            />
          </Link>
        ))}
      </div>
    </section>
  );
}