"use client";

import { TrendingUp } from "lucide-react";

import {
  isApplicable,
  type OverloadAdvice,
} from "@/features/routine/overload-advice";

/**
 * 과부하 추천 한 줄 — 성장 그래프·운동모드·계획 편집이 **같은 모양**으로 쓴다.
 * 화면마다 따로 그리면 같은 판단에 다른 색·다른 말머리가 붙는다.
 *
 * `onApply` 를 주면 '적용' 버튼이 붙는다. 무게를 정하는 그 순간(운동모드·계획 편집)에는
 * 읽고 손으로 옮겨 적게 두지 않고 한 번에 넣을 수 있어야 쓸모가 있다.
 * 다만 **적용은 언제나 사용자가 누른다** — 제안이 값을 몰래 바꾸면 그건 추천이 아니다.
 */
export function OverloadHint({
  advice,
  onApply,
  compact = false,
}: {
  advice: OverloadAdvice;
  /** 제안값을 입력란에 넣는다. 없으면 읽기 전용(근거만). */
  onApply?: (v: { weightKg: number | null; reps: number | null }) => void;
  /** 좁은 자리(계획 편집 줄 아래)용 — 글자·여백을 줄인다. */
  compact?: boolean;
}) {
  const tone = advice.attention
    ? "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
    : advice.action === "increase"
      ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
      : "bg-zinc-50 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300";
  const headline = [
    advice.label,
    advice.suggestedKg !== null ? `${advice.suggestedKg}kg` : null,
    advice.suggestedReps !== null ? `${advice.suggestedReps}회` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      data-testid={`overload-hint-${advice.exerciseId}`}
      data-action={advice.action}
      className={`rounded-lg ${compact ? "px-2 py-1.5 text-[11px]" : "px-2.5 py-2 text-xs"} ${tone}`}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <p className="flex items-center gap-1 font-semibold">
          <TrendingUp aria-hidden="true" size={compact ? 11 : 12} />
          {headline}
        </p>
        {onApply && isApplicable(advice) ? (
          <button
            type="button"
            data-testid={`overload-apply-${advice.exerciseId}`}
            onClick={() =>
              onApply({
                weightKg: advice.suggestedKg,
                reps: advice.suggestedReps,
              })
            }
            className="ml-auto shrink-0 rounded-full border border-current/30 bg-white/70 px-2.5 py-0.5 text-[11px] font-bold transition hover:bg-white dark:bg-zinc-900/60 dark:hover:bg-zinc-900"
          >
            적용
          </button>
        ) : null}
      </div>
      <p className={`${compact ? "mt-0.5" : "mt-0.5"} leading-5 opacity-80`}>
        {advice.reason}
      </p>
    </div>
  );
}
