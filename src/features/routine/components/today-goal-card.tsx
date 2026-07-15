"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Flag, Target, X } from "lucide-react";

import { BodyLogForm } from "@/features/profile/components/body-log-form";

/** 체형 목표 표시(운동탭). 무엇이 현재 얼마에서 목표 얼마까지, 몇 남았는지. */
export type GoalCardView = {
  metricLabel: string;
  /** 감량/감소/증량 */
  directionLabel: string;
  currentText: string;
  targetText: string;
  remainingText: string;
  reached: boolean;
} | null;

/** 다짐 미션 1개 표시용. */
export type MissionCardView = {
  id: string;
  title: string;
  /** "12/20일", "1200/2000kcal" 등 현재/목표. */
  valueText: string;
  pct: number;
  /** "D-5" / "오늘 마감" / "달성" / "기간 종료" */
  statusText: string;
  done: boolean;
};

/**
 * 운동탭 메인 — 내 체형 목표(자세히)와 다짐 미션 진행률을 함께 보여준다.
 * 목표 카드를 탭하면 체형 기록 입력이 열린다.
 */
export function TodayGoalCard({
  goal,
  missions,
  current,
  totalMissions,
}: {
  goal: GoalCardView;
  missions: MissionCardView[];
  current: {
    weightKg: number | null;
    heightCm: number | null;
    bodyFatPct: number | null;
    muscleMassKg: number | null;
  };
  /** 활성 다짐 전체 개수(더 있으면 '전체 보기'). */
  totalMissions: number;
}) {
  const [logOpen, setLogOpen] = useState(false);

  if (!goal && missions.length === 0) return null;

  return (
    <section className="space-y-3">
      {/* 체형 목표 — 탭하면 기록 */}
      {goal ? (
        <button
          type="button"
          onClick={() => setLogOpen(true)}
          className="flex w-full items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-left transition active:scale-[0.99] dark:border-emerald-900/50 dark:bg-emerald-950/25"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <Target aria-hidden="true" size={22} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-bold text-emerald-700 dark:text-emerald-400">
              {goal.metricLabel} {goal.directionLabel} 목표
            </span>
            {goal.reached ? (
              <span className="block text-lg font-black text-emerald-700 dark:text-emerald-300">
                목표 달성 🎉
              </span>
            ) : (
              <span className="block text-lg font-black text-zinc-950 dark:text-zinc-50">
                {goal.metricLabel} {goal.remainingText}{" "}
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  남음
                </span>
              </span>
            )}
          </span>
          <ArrowRight
            aria-hidden="true"
            size={18}
            className="shrink-0 text-emerald-500"
          />
        </button>
      ) : null}

      {/* 다짐 미션 */}
      {missions.length > 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-zinc-950 dark:text-zinc-100">
              <Flag aria-hidden="true" size={15} className="text-emerald-600" />내
              다짐
            </h2>
            <Link
              href="/commitments"
              className="text-xs font-semibold text-emerald-700 dark:text-emerald-400"
            >
              {totalMissions > missions.length
                ? `전체 ${totalMissions}개 보기`
                : "관리"}
            </Link>
          </div>
          <ul className="space-y-3">
            {missions.map((m) => (
              <li key={m.id}>
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                    {m.title}
                  </span>
                  <span
                    className={`shrink-0 text-xs font-bold ${
                      m.done
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-zinc-400"
                    }`}
                  >
                    {m.statusText}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className={`h-full rounded-full ${m.done ? "bg-emerald-500" : "bg-emerald-400"}`}
                      style={{ width: `${Math.min(100, Math.max(0, m.pct))}%` }}
                    />
                  </div>
                  <span className="w-24 shrink-0 text-right text-[11px] font-semibold tabular-nums text-zinc-500 dark:text-zinc-400">
                    {m.valueText}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* 체형 기록 모달 */}
      {logOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:items-center sm:pb-4"
          onClick={() => setLogOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl dark:bg-zinc-800 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-zinc-950 dark:text-zinc-100">
                체형 기록
              </h2>
              <button
                type="button"
                aria-label="닫기"
                onClick={() => setLogOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-700"
              >
                <X aria-hidden="true" size={18} />
              </button>
            </div>
            <BodyLogForm current={current} onDone={() => setLogOpen(false)} />
          </div>
        </div>
      ) : null}
    </section>
  );
}
