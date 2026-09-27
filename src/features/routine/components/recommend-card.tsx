"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";

import { saveRoutineAction } from "@/features/routine/actions";
import type { RoutineRecommendation } from "@/features/body-composition/data";

export function RecommendRoutineCard({
  recommendation,
}: {
  recommendation: RoutineRecommendation;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function apply() {
    start(async () => {
      const res = await saveRoutineAction(
        recommendation.splits,
        recommendation.variantId,
        null,
        "recommend",
      );
      if (res.ok) {
        router.push("/routine");
        router.refresh();
      }
    });
  }

  const sourceLabel =
    recommendation.source === "body"
      ? "체성분 기반 추천"
      : "체형·경력 기반 추천";

  return (
    <section className="rounded-[0.875rem] border border-brand/30 bg-brand-soft p-3">
      {/*
 모바일에서는 세로 스택 — 뱃지·헤드라인·이유 위, 적용 버튼은 풀폭 아래.
 sm+ 부터 좌우 분할 (뱃지 그룹 vs 버튼). 2026-09-16 촘촘하게 — 여백·글자 한 단계씩 줄임.
 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <span className="inline-flex max-w-full items-center gap-1 text-xs font-semibold text-brand">
            <Sparkles aria-hidden="true" size={13} />
            <span className="truncate">{sourceLabel}</span>
          </span>
          <h2 className="mt-1 text-base font-semibold text-zinc-950 dark:text-zinc-100">
            {recommendation.headline}
          </h2>
          <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-300">
            {recommendation.reason}
          </p>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={apply}
          className="app-press inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-brand px-4 text-sm font-semibold text-white dark:text-zinc-950 disabled:opacity-60 sm:w-auto"
        >
          {pending ? (
            <Loader2 aria-hidden="true" className="animate-spin" size={15} />
          ) : null}
          이 추천으로 적용
        </button>
      </div>
    </section>
  );
}
