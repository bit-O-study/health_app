"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Loader2, Sparkles } from "lucide-react";

import type { CoachAnalysisResult } from "@/features/coach/coach-actions";
import type { CoachAnalysis } from "@/features/coach/parse";
import { AiDisclaimer } from "@/features/coach/components/ai-disclaimer";
import {
  analysisDateLabel,
  type StoredAnalysis,
} from "@/features/coach/analysis-history";

/**
 * 분석 실행 버튼 + 결과(총평 + 포인트 카드) 렌더. run 은 서버 액션.
 *
 * 🔴 **지난 분석을 먼저 보여준다**(`saved`). 분석은 한 번에 사용량 한도를 한 칸 먹는데,
 * 화면을 나갔다 오는 것만으로 다시 부르게 하면 **읽으려고 돈을 내는** 구조가 된다.
 * 보관해 둔 결과를 그대로 띄우고, 새로 받고 싶을 때만 버튼을 누르게 한다.
 */
export function AnalysisSection({
  icon,
  title,
  description,
  cta,
  run,
  saved = null,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  cta: string;
  run: () => Promise<CoachAnalysisResult>;
  /** 서버가 읽어 온 지난 분석. 없으면 null. */
  saved?: StoredAnalysis | null;
}) {
  const [pending, start] = useTransition();
  const [analysis, setAnalysis] = useState<CoachAnalysis | null>(saved);
  // 새로 받은 결과에는 날짜표를 안 붙인다 — 방금 것이라 '오늘 분석' 이 군더더기다.
  const [savedAt, setSavedAt] = useState<string | null>(saved?.createdAt ?? null);
  const [error, setError] = useState<string | null>(null);

  function go() {
    setError(null);
    start(async () => {
      const r = await run();
      if (r.ok) {
        setAnalysis(r.analysis);
        setSavedAt(null);
      } else setError(r.error);
    });
  }

  return (
    <section className="app-card p-3">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold leading-5 text-zinc-900 dark:text-zinc-100">
            {title}
          </h2>
          <p className="truncate text-xs leading-4 text-zinc-500 dark:text-zinc-400">
            {description}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={go}
        disabled={pending}
        className="app-press mt-2.5 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-brand text-sm font-semibold text-white dark:text-zinc-950 disabled:opacity-50"
      >
        {pending ? (
          <Loader2 aria-hidden="true" size={16} className="animate-spin" />
        ) : (
          <Sparkles aria-hidden="true" size={16} />
        )}
        {pending ? "분석 중…" : analysis ? "다시 분석하기" : cta}
      </button>

      {error ? (
        <p className="mt-2.5 rounded-[10px] bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">
          {error}
        </p>
      ) : null}

      {analysis ? (
        <div className="mt-3 space-y-2">
          {savedAt ? (
            <p
              data-testid="analysis-saved-at"
              className="text-xs font-semibold text-zinc-400 dark:text-zinc-500"
            >
              {analysisDateLabel(savedAt)}
            </p>
          ) : null}
          <p className="rounded-[10px] bg-brand-soft p-3 text-sm leading-6 text-brand">
            {analysis.summary}
          </p>
          <ul className="divide-y divide-[var(--line)] rounded-[10px] bg-zinc-100 dark:bg-white/[0.06]">
            {analysis.points.map((p, i) => (
              <li
                key={i}
                className="px-3 py-2"
              >
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {p.title}
                </p>
                {p.detail ? (
                  <p className="mt-0.5 text-xs leading-5 text-zinc-600 dark:text-zinc-400">
                    {p.detail}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
          {/* 결과 바로 아래에 — 약관에만 있으면 읽는 사람이 없다. */}
          <AiDisclaimer />
        </div>
      ) : null}
    </section>
  );
}
