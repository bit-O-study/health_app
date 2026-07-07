"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dumbbell, Loader2 } from "lucide-react";

import { seoulYmd } from "@/features/routine/data";
import { deferRoutineOneDayAction } from "@/features/routine/actions";
import { clearDailyPlanForDateAction } from "@/features/routine/daily-plan-actions";

/**
 * "운동 직접 담기" — 오늘 원래 루틴을 내일로 미루고, 운동 등록 페이지(/plan/today)로 이동해
 * 모든 운동을 직접 추가한다. (부위 바꾸기와 동일한 흐름)
 */
export function TodayAddExercises() {
  const router = useRouter();
  const [pending, start] = useTransition();

  function go() {
    start(async () => {
      // 루틴 전체를 하루씩 밀고(아무 날도 안 사라짐) 오늘을 '변경된 날'로 마킹해
      // 원래 운동을 숨긴 뒤, 빈값에서 직접 담는다.
      await deferRoutineOneDayAction();
      await clearDailyPlanForDateAction(seoulYmd());
      router.push("/plan/today");
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={go}
      disabled={pending}
      className="inline-flex h-9 items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 transition hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30"
    >
      {pending ? (
        <Loader2 aria-hidden="true" size={14} className="animate-spin" />
      ) : (
        <Dumbbell aria-hidden="true" size={14} />
      )}
      운동 직접 담기
    </button>
  );
}
