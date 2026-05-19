"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Dumbbell, GripVertical } from "lucide-react";

import { reorderPlanAction } from "@/features/routine/plan-actions";

export type TodayPlanItem = {
  id: string;
  exerciseId: string;
  equipment: string;
  name: string;
  equipmentLabel: string;
  sets: number;
  reps: number;
  weightKg: number | null;
};

export function TodayPlanList({
  focus,
  items,
}: {
  focus: string;
  items: TodayPlanItem[];
}) {
  const router = useRouter();
  const [order, setOrder] = useState(items);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [, startSaving] = useTransition();

  function persist(next: TodayPlanItem[]) {
    startSaving(async () => {
      await reorderPlanAction(
        focus,
        next.map((i) => i.id),
      );
      router.refresh();
    });
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      return;
    }
    const next = [...order];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    setOrder(next);
    setDragIndex(null);
    persist(next);
  }

  return (
    <ul className="space-y-2">
      {order.map((item, index) => (
        <li
          key={item.id}
          draggable
          onDragStart={() => setDragIndex(index)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop(index)}
          onDragEnd={() => setDragIndex(null)}
          className={`flex items-center gap-2 rounded-xl border bg-white p-4 shadow-sm transition ${
            dragIndex === index
              ? "border-emerald-400 opacity-60"
              : "border-zinc-200 hover:border-emerald-300 hover:shadow-md"
          }`}
        >
          <span
            aria-hidden="true"
            className="flex h-8 w-6 shrink-0 cursor-grab items-center justify-center text-zinc-400 active:cursor-grabbing"
            title="드래그해서 순서 변경"
          >
            <GripVertical size={18} />
          </span>

          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            <Dumbbell aria-hidden="true" size={20} />
          </span>

          <Link
            href={`/exercises/${item.exerciseId}?eq=${item.equipment}`}
            className="group flex min-w-0 flex-1 items-center gap-2"
          >
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-zinc-950">
                {item.name}
                <span className="ml-2 text-xs font-medium text-zinc-500">
                  {item.equipmentLabel}
                </span>
              </h3>
              <p className="mt-0.5 text-sm text-zinc-600">
                {item.sets}세트 × {item.reps}회
                {item.weightKg !== null
                  ? ` · ${item.weightKg}kg`
                  : " · 맨몸"}
              </p>
            </div>
            <ChevronRight
              aria-hidden="true"
              className="shrink-0 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-emerald-700"
              size={18}
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}