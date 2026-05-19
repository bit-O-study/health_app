"use client";

import { useState } from "react";
import { Dumbbell } from "lucide-react";

import { cn } from "@/lib/utils";
import type { FocusTone } from "@/features/routine/data";
import {
  EQUIPMENT_LABELS,
  exercisesForFocus,
  type EquipmentId,
} from "@/features/routine/exercise-catalog";

export function TodayExercises({ tone }: { tone: FocusTone }) {
  const exercises = exercisesForFocus(tone);

  const [selected, setSelected] = useState<Record<string, EquipmentId>>(() =>
    Object.fromEntries(
      exercises.map((ex) => [ex.id, ex.equipments[0].equipment]),
    ),
  );

  if (exercises.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
        오늘 할 운동
      </h2>
      <div className="space-y-3">
        {exercises.map((ex) => {
          const current =
            ex.equipments.find((e) => e.equipment === selected[ex.id]) ??
            ex.equipments[0];
          return (
            <div
              key={ex.id}
              className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <Dumbbell aria-hidden="true" size={20} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-zinc-950">
                    {ex.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-zinc-500">{ex.target}</p>
                </div>
              </div>

              {/* 기구 선택 */}
              <div className="mt-4">
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  기구 선택
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {ex.equipments.map((e) => {
                    const active = e.equipment === current.equipment;
                    return (
                      <button
                        key={e.equipment}
                        type="button"
                        onClick={() =>
                          setSelected((prev) => ({
                            ...prev,
                            [ex.id]: e.equipment,
                          }))
                        }
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-semibold transition",
                          active
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : "border-zinc-300 bg-white text-zinc-700 hover:border-emerald-300 hover:bg-emerald-50",
                        )}
                      >
                        {EQUIPMENT_LABELS[e.equipment]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 선택한 기구의 운동법 */}
              <div className="mt-4">
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  {EQUIPMENT_LABELS[current.equipment]} 운동법
                </p>
                <ol className="space-y-1.5">
                  {current.method.map((step, i) => (
                    <li
                      key={step}
                      className="flex gap-2 text-sm leading-6 text-zinc-700"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[11px] font-bold text-zinc-600">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}