"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";
import {
  EQUIPMENT_LABELS,
  type CatalogExercise,
  type EquipmentId,
} from "@/features/routine/exercise-catalog";
import { exerciseSummary } from "@/features/workout-timer/exercise-guides";

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

  // 장황한 단계 나열 대신 한 줄 요약 + 핵심 포인트로 딱딱 간결하게.
  const summary = exerciseSummary(exercise.id);

  return (
    <section className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-100">
        운동법 핵심
      </h2>

      {/* 가능한 기구 (선택해 두면 루틴 등록 시 기본 기구로) */}
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
                  : "border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30",
              )}
            >
              {EQUIPMENT_LABELS[e.equipment]}
            </button>
          );
        })}
      </div>

      {/* 한 줄 요약 — 핵심 자세/그립 → 타겟 */}
      <p className="mt-5 rounded-xl border border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-base font-bold leading-7 text-emerald-900 dark:text-emerald-100">
        {summary.oneLiner}
      </p>

      {/* 핵심 포인트 */}
      {summary.cues.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {summary.cues.map((c, i) => (
            <li
              key={i}
              className="flex gap-2.5 text-sm leading-6 text-zinc-700 dark:text-zinc-300"
            >
              <span aria-hidden="true" className="shrink-0 text-emerald-500">
                •
              </span>
              {c}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
