"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Target, Trash2 } from "lucide-react";

import { createGoalAction, deleteGoalAction } from "@/features/lite/goal-actions";
import type { GoalsView } from "@/features/lite/goals-data";

const md = (ymd: string) => `${Number(ymd.slice(5, 7))}월 ${Number(ymd.slice(8, 10))}일`;
const kg = (n: number) => `${n.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}kg`;

/**
 * 맞춤 운동 › 성장 탭 '내 목표'(라이트 2단계 혜택 1, 2026-10-02).
 * 무료 1개(진행률만) · 라이트 3개(+ 예상 도달일·필요 속도). 시작값은 서버가 최근 예상 1RM 으로 정한다.
 */
export function GoalsCard({ view }: { view: GoalsView }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const first = view.candidates[0];
  const [exerciseId, setExerciseId] = useState(first?.exerciseId ?? "");
  const picked = view.candidates.find((c) => c.exerciseId === exerciseId);
  const [targetKg, setTargetKg] = useState(first ? String(first.suggestKg) : "");
  const [targetDate, setTargetDate] = useState(view.defaultDate);
  const canAdd = view.active < view.limit && view.candidates.length > 0;

  function choose(id: string) {
    setExerciseId(id);
    const c = view.candidates.find((x) => x.exerciseId === id);
    if (c) setTargetKg(String(c.suggestKg));
  }

  function save() {
    setError(null);
    start(async () => {
      const r = await createGoalAction({ exerciseId, targetKg: Number(targetKg), targetDate });
      if (!r.ok) return setError(r.error);
      setOpen(false);
      router.refresh();
    });
  }

  function remove(id: string) {
    start(async () => {
      const r = await deleteGoalAction(id);
      if (!r.ok) return setError(r.error);
      router.refresh();
    });
  }

  return (
    <section className="app-card space-y-3 p-3" data-testid="fit-goals">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          <Target aria-hidden="true" size={16} className="text-brand" />
          내 목표
        </h2>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {view.active}/{view.limit}개
        </span>
      </div>

      {view.goals.length === 0 && !open ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          &ldquo;벤치프레스 100kg · 3개월&rdquo;처럼 목표를 정하면 지금 어디쯤인지, 언제 닿을지 알려 드려요.
        </p>
      ) : null}

      <ul className="space-y-3">
        {view.goals.map((g) => {
          const p = g.progress;
          return (
            <li key={g.id} className="space-y-1" data-testid={`goal-${g.exerciseId}`}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{g.name}</span>
                <span className="shrink-0 text-sm tabular-nums text-zinc-800 dark:text-zinc-100">
                  {kg(p.currentKg)} → <b>{kg(g.targetKg)}</b>
                </span>
              </div>
              <div
                className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-white/[0.08]"
                role="progressbar"
                aria-label={`${g.name} 목표 진행률`}
                aria-valuenow={p.pct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div className="h-full rounded-full bg-brand" style={{ width: `${p.pct}%` }} />
              </div>
              <div className="flex items-start justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <span data-testid={`goal-line-${g.exerciseId}`}>
                  <b className="text-zinc-700 dark:text-zinc-200">{p.pct}%</b>
                  {p.achieved
                    ? " · 목표 달성! 🎉"
                    : !view.full
                      ? ` · ${md(g.targetDate)}까지`
                      : p.etaDate
                        ? ` · 지금 속도면 ${md(p.etaDate)}쯤 · ${
                            p.aheadDays! >= 0 ? `목표보다 ${Math.round(p.aheadDays! / 7)}주 빠름` : `목표보다 ${Math.round(-p.aheadDays! / 7)}주 늦음`
                          }`
                        : p.stalled
                          ? " · 최근 6주 제자리예요 — 반복 수나 운동을 바꿔 보세요"
                          : p.neededPerWeek != null
                            ? ` · ${md(g.targetDate)}까지 주 ${p.neededPerWeek}kg씩`
                            : ""}
                  {view.full && !p.achieved && !p.etaDate && !p.stalled && p.slopePerWeek == null ? " (기록이 더 쌓이면 예상일을 알려 드려요)" : ""}
                </span>
                {!g.achievedAt ? (
                  <button
                    type="button"
                    onClick={() => remove(g.id)}
                    disabled={pending}
                    aria-label={`${g.name} 목표 지우기`}
                    className="shrink-0 rounded-full p-1 text-zinc-400 hover:text-danger"
                  >
                    <Trash2 aria-hidden="true" size={14} />
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      {!view.full && view.goals.length > 0 ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          라이트에서 목표 3개 + 예상 도달일·필요 속도를 볼 수 있어요.{" "}
          <Link href="/settings/subscription" className="font-semibold text-brand">
            라이트 알아보기
          </Link>
        </p>
      ) : null}

      {open ? (
        <div className="space-y-2 rounded-xl border border-line p-3" data-testid="goal-form">
          <label className="block space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
            종목
            <select
              value={exerciseId}
              onChange={(e) => choose(e.target.value)}
              className="block h-10 w-full rounded-[10px] bg-zinc-100 px-3 text-base text-zinc-900 dark:bg-white/[0.08] dark:text-zinc-100"
            >
              {view.candidates.map((c) => (
                <option key={c.exerciseId} value={c.exerciseId}>
                  {c.name} (지금 {kg(c.currentKg)})
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
              목표 무게(예상 1RM, kg)
              <input
                type="number"
                inputMode="decimal"
                step="2.5"
                value={targetKg}
                onChange={(e) => setTargetKg(e.target.value)}
                className="block h-10 w-full rounded-[10px] bg-zinc-100 px-3 text-base tabular-nums text-zinc-900 dark:bg-white/[0.08] dark:text-zinc-100"
              />
            </label>
            <label className="block space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
              언제까지
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="block h-10 w-full rounded-[10px] bg-zinc-100 px-3 text-base text-zinc-900 dark:bg-white/[0.08] dark:text-zinc-100"
              />
            </label>
          </div>
          {picked ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              지금 {kg(picked.currentKg)}에서 시작해요. 예상 1RM = 무게 × (1 + 횟수 ÷ 30).
            </p>
          ) : null}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={pending || !exerciseId}
              className="app-press h-10 flex-1 rounded-full bg-brand text-sm font-semibold text-white disabled:opacity-50 dark:text-zinc-950"
            >
              목표 저장
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-10 rounded-full px-4 text-sm font-semibold text-zinc-600 dark:text-zinc-300"
            >
              취소
            </button>
          </div>
        </div>
      ) : canAdd ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="app-press h-10 w-full rounded-full border border-brand text-sm font-semibold text-brand"
        >
          목표 정하기
        </button>
      ) : view.candidates.length === 0 && view.active < view.limit ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">무게를 단 운동 기록이 쌓이면 목표를 정할 수 있어요.</p>
      ) : null}

      {error ? (
        <p role="alert" className="text-xs font-semibold text-danger">
          {error}
        </p>
      ) : null}
    </section>
  );
}
