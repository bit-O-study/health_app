"use client";

import { useState } from "react";
import { Wand2 } from "lucide-react";

import { weightStepKg } from "@/features/routine/progress";
import {
  DEFAULTS,
  SET_SCHEME_LABELS,
  buildSetDetails,
  type SetScheme,
} from "@/features/routine/set-scheme";
import type { SetDetail } from "@/features/routine/set-details";

/** 한 운동에 곧바로 적용할 수 있는 방식만 고른다 — 묶음(슈퍼세트)은 별도 기능. */
const PICKABLE: readonly SetScheme[] = [
  "drop",
  "pyramid",
  "reverse_pyramid",
  "top_backoff",
  "cluster",
  "rest_pause",
] as const;

/**
 * 세트 방식 한 번에 채우기.
 *
 * 드롭·피라미드·탑세트를 손으로 넣으려면 세트마다 무게를 계산해 20줄을 채워야 했다.
 * 여기서 방식만 고르면 **기준 세트·횟수·무게**로 세트별 값을 만들어 넣는다.
 * 만들어진 값은 그대로 `set_details` 에 저장되므로 운동모드·기록·볼륨이 이미 이해한다.
 *
 * 무게는 그 기구의 증량 단위(`weightStepKg`)로 맞춘다 — 바벨 2.5kg, 큰 종목·머신 5kg 등.
 * 그래야 "62.4kg" 같이 실제로 못 만드는 무게가 안 나온다.
 */
export function SetSchemePicker({
  sets,
  reps,
  weightKg,
  exerciseId,
  equipment,
  disabled = false,
  onApply,
}: {
  sets: number;
  reps: number;
  weightKg: number | null;
  exerciseId: string;
  equipment?: string | null;
  disabled?: boolean;
  onApply: (details: SetDetail[]) => void;
}) {
  const [open, setOpen] = useState(false);

  // 무게가 없으면(맨몸) 무게를 깎는 방식은 의미가 없다.
  const hasWeight = weightKg !== null && weightKg > 0;
  const stepKg = weightStepKg(exerciseId, equipment) ?? DEFAULTS.plateStepKg;

  function apply(scheme: SetScheme) {
    onApply(
      buildSetDetails({
        scheme,
        sets: Math.max(1, sets || 3),
        reps: Math.max(1, reps || 10),
        weightKg,
        params: { plateStepKg: stepKg },
      }),
    );
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="inline-flex h-7 items-center gap-1 rounded-md border app-field px-2 text-xs font-semibold text-zinc-600 transition hover:border-brand/40 hover:text-brand disabled:opacity-50 dark:text-zinc-300"
      >
        <Wand2 aria-hidden="true" size={12} />
        세트 방식
      </button>
    );
  }

  return (
    <div className="basis-full rounded-[10px] bg-zinc-100 p-2 dark:bg-white/[0.06]">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
          방식을 고르면 세트별 무게·횟수를 채웁니다
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs font-semibold text-zinc-500 underline-offset-2 hover:underline dark:text-zinc-400"
        >
          닫기
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {PICKABLE.map((scheme) => {
          // 무게가 없으면 무게를 조절하는 방식은 못 쓴다(클러스터·레스트포즈는 가능).
          const needsWeight = scheme !== "cluster" && scheme !== "rest_pause";
          const off = disabled || (needsWeight && !hasWeight);
          return (
            <button
              key={scheme}
              type="button"
              onClick={() => apply(scheme)}
              disabled={off}
              title={SET_SCHEME_LABELS[scheme].hint}
              className="inline-flex h-8 items-center rounded-full bg-white px-3 text-xs font-semibold text-zinc-700 transition hover:text-brand disabled:opacity-40 dark:bg-zinc-800 dark:text-zinc-200"
            >
              {SET_SCHEME_LABELS[scheme].name}
            </button>
          );
        })}
      </div>
      {!hasWeight ? (
        <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          무게를 먼저 넣으면 드롭·피라미드처럼 무게를 조절하는 방식도 쓸 수 있어요.
        </p>
      ) : (
        <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          기준 {sets}세트 × {reps}회 · {weightKg}kg, {stepKg}kg 단위로 맞춥니다.
        </p>
      )}
    </div>
  );
}
