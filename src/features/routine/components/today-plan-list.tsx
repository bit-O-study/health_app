"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, ChevronRight, Dumbbell, GripVertical, X } from "lucide-react";

import { reorderPlanAction } from "@/features/routine/plan-actions";
import { estimateStrengthKcal } from "@/features/routine/calories";
import { setExerciseStatusAction } from "@/features/routine/exercise-completion-actions";

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
  weightKg,
  doneIds,
  skippedIds,
}: {
  focus: string;
  items: TodayPlanItem[];
  weightKg: number | null;
  doneIds: string[];
  skippedIds: string[];
}) {
  const router = useRouter();
  const [order, setOrder] = useState(items);
  const [done, setDone] = useState<Set<string>>(new Set(doneIds));
  const [skipped, setSkipped] = useState<Set<string>>(new Set(skippedIds));
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [, startTx] = useTransition();
  const w = weightKg ?? 65;

  function persistOrder(next: TodayPlanItem[]) {
    startTx(async () => {
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
    persistOrder(next);
  }

  function setStatus(id: string, target: "done" | "skipped" | "clear") {
    const nextDone = new Set(done);
    const nextSkipped = new Set(skipped);
    nextDone.delete(id);
    nextSkipped.delete(id);
    if (target === "done") nextDone.add(id);
    else if (target === "skipped") nextSkipped.add(id);
    setDone(nextDone);
    setSkipped(nextSkipped);
    startTx(async () => {
      await setExerciseStatusAction(id, target);
      router.refresh();
    });
  }

  function onDoneClick(id: string) {
    setStatus(id, done.has(id) ? "clear" : "done");
  }

  function onSkipClick(id: string) {
    setStatus(id, skipped.has(id) ? "clear" : "skipped");
  }

  return (
    <ul className="space-y-2">
      {order.map((item, index) => {
        const isDone = done.has(item.id);
        const isSkipped = skipped.has(item.id);
        const kcal = Math.round(estimateStrengthKcal(w, item.exerciseId, item.sets));
        return (
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
                : isDone
                  ? "border-emerald-200 bg-emerald-50/40"
                  : isSkipped
                    ? "border-zinc-200 bg-zinc-100/60"
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

            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                aria-label={isDone ? "완료 취소" : "완료"}
                title={isDone ? "완료 취소" : "완료 처리"}
                onClick={() => onDoneClick(item.id)}
                className={`flex h-7 w-7 items-center justify-center rounded-md border transition ${
                  isDone
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-zinc-300 bg-white text-transparent hover:border-emerald-400 hover:text-emerald-500"
                }`}
              >
                <Check aria-hidden="true" size={16} />
              </button>
              <button
                type="button"
                aria-label={isSkipped ? "되살리기" : "오늘 안 함"}
                title={isSkipped ? "되살리기" : "오늘은 안 함"}
                onClick={() => onSkipClick(item.id)}
                className={`flex h-7 w-7 items-center justify-center rounded-md border transition ${
                  isSkipped
                    ? "border-zinc-500 bg-zinc-500 text-white"
                    : "border-zinc-300 bg-white text-transparent hover:border-zinc-400 hover:text-zinc-500"
                }`}
              >
                <X aria-hidden="true" size={16} />
              </button>
            </div>

            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <Dumbbell aria-hidden="true" size={20} />
            </span>

            <Link
              href={`/exercises/${item.exerciseId}?eq=${item.equipment}`}
              className="group flex min-w-0 flex-1 items-center gap-2"
            >
              <div className="min-w-0 flex-1">
                <h3
                  className={`text-base font-bold ${
                    isDone
                      ? "text-zinc-500 line-through"
                      : isSkipped
                        ? "text-zinc-400 line-through"
                        : "text-zinc-950"
                  }`}
                >
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
                  <span
                    className={`ml-2 text-xs ${
                      isSkipped ? "text-zinc-400 line-through" : "text-orange-700"
                    }`}
                  >
                    · 약 {kcal}kcal
                  </span>
                </p>
              </div>
              <ChevronRight
                aria-hidden="true"
                className="shrink-0 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-emerald-700"
                size={18}
              />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
