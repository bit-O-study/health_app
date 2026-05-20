"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, RotateCcw } from "lucide-react";

import {
  markWorkoutCompleteAction,
  unmarkWorkoutCompleteAction,
} from "@/features/routine/completion-actions";

export function MarkCompleteButton({
  focus,
  calories,
  done,
}: {
  focus: string;
  calories: number;
  done: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function toggle() {
    start(async () => {
      if (done) {
        await unmarkWorkoutCompleteAction();
      } else {
        await markWorkoutCompleteAction(focus, calories);
      }
      router.refresh();
    });
  }

  if (done) {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={toggle}
        className="inline-flex h-10 items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-4 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-60"
      >
        {pending ? (
          <Loader2 aria-hidden="true" className="animate-spin" size={15} />
        ) : (
          <RotateCcw aria-hidden="true" size={15} />
        )}
        완료됨 · 취소
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={toggle}
      className="inline-flex h-10 items-center gap-1.5 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
    >
      {pending ? (
        <Loader2 aria-hidden="true" className="animate-spin" size={15} />
      ) : (
        <Check aria-hidden="true" size={15} />
      )}
      오늘 운동 완료
    </button>
  );
}
