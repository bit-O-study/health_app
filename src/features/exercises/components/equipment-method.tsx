"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";
import {
  EQUIPMENT_LABELS,
  type CatalogExercise,
  type EquipmentId,
} from "@/features/routine/exercise-catalog";

export function EquipmentMethod({
  exercise,
  initialEquipment,
}: {
  exercise: CatalogExercise;
  initialEquipment?: EquipmentId;
}) {
  const first =
    exercise.equipments.find((e) => e.equipment === initialEquipment)
      ?.equipment ?? exercise.equipments[0].equipment;
  const [selected, setSelected] = useState<EquipmentId>(first);

  const current =
    exercise.equipments.find((e) => e.equipment === selected) ??
    exercise.equipments[0];

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-950">기구별 운동법</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {exercise.equipments.map((e) => {
          const active = e.equipment === current.equipment;
          return (
            <button
              key={e.equipment}
              type="button"
              onClick={() => setSelected(e.equipment)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-semibold transition",
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

      <ol className="mt-5 space-y-3">
        {current.method.map((step, i) => (
          <li
            key={step}
            className="flex gap-3 text-sm leading-6 text-zinc-700"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
    </section>
  );
}