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
        router.push("/");
        router.refresh();
      }
    });
  }

  const sourceLabel =
    recommendation.source === "body"
      ? "체성분 기반 추천"
      : "체형·경력 기반 추천";

  return (
    <section className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-5 shadow-sm">
      {/*
 모바일에서는 세로 스택 — 뱃지·헤드라인·이유 위, 적용 버튼은 풀폭 아래.
 sm+ 부터 좌우 분할 (뱃지 그룹 vs 버튼).
 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">
            <Sparkles aria-hidden="true" size={13} />
            <span className="truncate">{sourceLabel}</span>
          </span>
          <h2 className="mt-3 text-lg font-bold text-zinc-950 dark:text-zinc-100 sm:text-xl">
            {recommendation.headline}
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
            {recommendation.reason}
          </p>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={apply}
          className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60 sm:w-auto"
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
