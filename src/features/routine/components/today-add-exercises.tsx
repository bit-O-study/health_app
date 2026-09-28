"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dumbbell, Loader2 } from "lucide-react";

import { seoulYmd } from "@/features/routine/data";
import { replaceTodayFocusAction } from "@/features/routine/actions";
import { clearDailyPlanForDateAction } from "@/features/routine/daily-plan-actions";

/**
 * "운동 직접 담기" — 오늘 원래 운동을 숨기고, 운동 등록 페이지(/plan/today)로 이동해
 * 모든 운동을 직접 추가한다. (부위 바꾸기와 동일한 흐름)
 */
export function TodayAddExercises() {
  const router = useRouter();
  const [pending, start] = useTransition();

  function go() {
    start(async () => {
      // 영구 루틴 일정은 보존하고 오늘만 '변경된 날(direct)'로 마킹해
      // 원래 운동을 숨긴 뒤, 빈값에서 전체 운동 직접 담는다.
      await replaceTodayFocusAction("direct");
      await clearDailyPlanForDateAction(seoulYmd());
      // direct=1 → 부위 제한 없이 빈 워밍업/본운동/마무리 섹션에서 '전체 운동' 추가.
      // push 직후 refresh 는 push 를 취소하는 레이스가 있어 넣지 않는다(이동 시 새로 렌더).
      router.push("/plan/today?direct=1");
    });
  }

  return (
    <button
      type="button"
      onClick={go}
      disabled={pending}
      className="min-h-11 min-w-11 inline-flex h-9 items-center gap-1.5 rounded-md border app-field px-3 text-xs font-semibold text-zinc-700 transition hover:border-brand/40 hover:bg-brand-soft disabled:opacity-60 dark:text-zinc-300"
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
