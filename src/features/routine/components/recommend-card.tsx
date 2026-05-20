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
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">
            <Sparkles aria-hidden="true" size={13} />
            {sourceLabel}
          </span>
          <h2 className="mt-3 text-xl font-bold text-zinc-950">
            {recommendation.headline}
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-700">
            {recommendation.reason}
          </p>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={apply}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
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
