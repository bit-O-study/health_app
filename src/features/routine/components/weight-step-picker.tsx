"use client";

import { useState, useTransition } from "react";

import { setWeightStepAction } from "@/features/profile/actions";
import { WEIGHT_STEP_CHOICES } from "@/features/routine/weight-steps";

/**
 * 이 종목의 증량 단위 바꾸기.
 *
 * 기본값은 기구와 종목 크기로 정한다(바벨 큰 종목 5kg · 작은 종목 2.5kg, 핀 스택
 * 5kg·2.5kg, 덤벨 2kg …). 그런데 **헬스장마다 스택이 다르다** — 같은 '머신' 이라도
 * 1kg 씩 올라가는 기구가 있고, 1.25kg 원판이 없어 바벨을 5kg 씩만 올리는 곳도 있다.
 * 그래서 무게를 실제로 조절하는 **그 자리**에서 단위를 바꿀 수 있게 둔다.
 *
 * 저장하면 그 종목의 ± 폭, 과부하 추천, 세트 방식(드롭·피라미드) 계산이 전부 따라간다.
 */
export function WeightStepPicker({
  exerciseId,
  currentStepKg,
  isOverridden,
  onSaved,
}: {
  exerciseId: string;
  /** 지금 적용 중인 단위(기본값이든 사용자 지정이든). */
  currentStepKg: number;
  /** 사용자가 직접 정해 둔 값인지 — 되돌리기 버튼을 보일지 판단. */
  isOverridden: boolean;
  /** 저장 뒤 화면을 새 값으로 다시 그리게 한다. */
  onSaved?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save(stepKg: number | null) {
    setError(null);
    start(async () => {
      const res = await setWeightStepAction(exerciseId, stepKg);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOpen(false);
      onSaved?.();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mx-auto mt-1 block text-xs font-semibold text-zinc-500 underline-offset-2 hover:underline dark:text-zinc-400"
      >
        증량 단위 {currentStepKg}kg{isOverridden ? " (내 설정)" : ""}
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-[10px] bg-zinc-100 p-2 dark:bg-white/[0.06]">
      <p className="mb-1.5 text-xs text-zinc-600 dark:text-zinc-300">
        이 헬스장에서 이 운동은 몇 kg 씩 올라가나요?
      </p>
      <div className="flex flex-wrap gap-1.5">
        {WEIGHT_STEP_CHOICES.map((kg) => (
          <button
            key={kg}
            type="button"
            disabled={pending}
            onClick={() => save(kg)}
            aria-pressed={kg === currentStepKg}
            className={`inline-flex h-8 items-center rounded-full px-3 text-xs font-semibold transition disabled:opacity-50 ${
              kg === currentStepKg
                ? "bg-brand text-white dark:text-zinc-950"
                : "bg-white text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
            }`}
          >
            {kg}kg
          </button>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2">
        {isOverridden ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => save(null)}
            className="text-xs font-semibold text-zinc-500 underline-offset-2 hover:underline disabled:opacity-50 dark:text-zinc-400"
          >
            기본값으로
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={pending}
          className="text-xs font-semibold text-zinc-500 underline-offset-2 hover:underline disabled:opacity-50 dark:text-zinc-400"
        >
          닫기
        </button>
      </div>
      {error ? (
        <p className="mt-1.5 text-xs text-danger">{error}</p>
      ) : null}
    </div>
  );
}
