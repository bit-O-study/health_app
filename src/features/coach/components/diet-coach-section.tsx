"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Salad } from "lucide-react";

import { reviewTodayDietAction } from "@/features/coach/ai-trainer-actions";
import {
  dietStorageKey,
  pctOf,
  readStoredDiet,
  type DietFeedback,
  type DietTargets,
  type TodayIntake,
} from "@/features/coach/diet-coach";
import { AiDisclaimer } from "@/features/coach/components/ai-disclaimer";

function Bar({ label, value, target, unit }: { label: string; value: number; target: number; unit: string }) {
  const pct = pctOf(value, target);
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-xs text-zinc-600 dark:text-zinc-300">
        <span>{label}</span>
        <span className="tabular-nums">
          {value.toLocaleString("ko-KR")} / {target.toLocaleString("ko-KR")}
          {unit} ({pct}%)
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-white/[0.08]">
        <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}

/**
 * AI 식단 관리(2026-09-30 2단계) — 목표(규칙)와 오늘 먹은 양은 늘 보여 주고,
 * [오늘 식단 봐 줘]를 누르면 AI 가 잘한 점·고칠 점·내일 메뉴를 준다. 결과는 기기에 오늘 하루 보관.
 */
export function DietCoachSection({
  userId,
  today,
  targets,
  intake,
  consent,
  remaining: initialRemaining,
  limit,
}: {
  userId: string;
  today: string;
  targets: DietTargets;
  intake: TodayIntake;
  consent: boolean;
  remaining: number;
  limit: number;
}) {
  const key = dietStorageKey(userId, today);
  const [fb, setFb] = useState<DietFeedback | null>(null);
  const [remaining, setRemaining] = useState(initialRemaining);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    try {
      const saved = readStoredDiet(window.localStorage.getItem(key));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setFb(saved);
    } catch {
      /* 보관 못 읽음 — 다시 받으면 된다 */
    }
  }, [key]);

  function review() {
    setError(null);
    start(async () => {
      const r = await reviewTodayDietAction();
      if (!r.ok) return setError(r.error);
      setFb(r.feedback);
      setRemaining((n) => Math.max(0, n - 1));
      try {
        window.localStorage.setItem(key, JSON.stringify(r.feedback));
      } catch {
        /* 보관 실패 */
      }
    });
  }

  return (
    <section className="app-card space-y-3 p-3" data-testid="ai-diet">
      <h2 className="flex items-center gap-1.5 text-base font-semibold text-zinc-900 dark:text-zinc-100">
        <Salad aria-hidden="true" size={18} className="text-brand" />
        오늘 식단
      </h2>
      <div className="space-y-2">
        <Bar label="칼로리" value={intake.kcal} target={targets.kcal} unit="kcal" />
        <Bar label="단백질" value={intake.proteinG} target={targets.proteinG} unit="g" />
        <Bar label="수분" value={intake.waterMl} target={targets.waterMl} unit="ml" />
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">목표는 내 몸무게·키·운동 목표로 정한 하루 기준이에요.</p>

      {consent ? (
        <>
          <button
            type="button"
            data-testid="ai-diet-review"
            onClick={review}
            disabled={pending || remaining <= 0}
            className="app-press inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-full border border-brand text-sm font-semibold text-brand disabled:opacity-50"
          >
            {pending ? <Loader2 aria-hidden="true" size={16} className="animate-spin" /> : null}
            {fb ? "오늘 식단 다시 봐 줘" : "오늘 식단 봐 줘"}
          </button>
          <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
            이번 달 {remaining}회 남았어요 (월 {limit}회)
          </p>
        </>
      ) : null}

      {error ? (
        <p role="alert" className="rounded-[10px] bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">
          {error}
        </p>
      ) : null}

      {fb ? (
        <div className="space-y-2" data-testid="ai-diet-feedback">
          {fb.summary ? <p className="text-sm text-zinc-800 dark:text-zinc-100">{fb.summary}</p> : null}
          {fb.good.length ? (
            <div>
              <p className="text-xs font-semibold text-brand">잘한 점</p>
              <ul className="list-disc pl-5 text-sm text-zinc-700 dark:text-zinc-200">
                {fb.good.map((t) => <li key={t}>{t}</li>)}
              </ul>
            </div>
          ) : null}
          {fb.fix.length ? (
            <div>
              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">고칠 점</p>
              <ul className="list-disc pl-5 text-sm text-zinc-700 dark:text-zinc-200">
                {fb.fix.map((t) => <li key={t}>{t}</li>)}
              </ul>
            </div>
          ) : null}
          {fb.tomorrow.length ? (
            <div>
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">내일 이렇게 드셔 보세요</p>
              <ul className="list-disc pl-5 text-sm text-zinc-700 dark:text-zinc-200">
                {fb.tomorrow.map((t) => <li key={t}>{t}</li>)}
              </ul>
            </div>
          ) : null}
          <AiDisclaimer />
        </div>
      ) : null}
    </section>
  );
}
