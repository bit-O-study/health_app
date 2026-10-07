"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";

import { applyFitPicksAction } from "@/features/routine/fit-actions";
import type { ApplyMode } from "@/features/routine/today-apply";

export type FitPickView = {
  exerciseId: string;
  name: string;
  equipment: string;
  /** 기구 이름(머신·덤벨…). */
  equipmentLabel: string;
  /** "3세트 × 10회 · 40kg" — 오늘만 담을 때 들어가는 값과 같다. */
  prescription: string | null;
  fills: { label: string; sets: string }[];
};

/**
 * 오늘 추천 카드(2026-10-06 UI 개편 · 2026-10-07 한 화면 개편: 줄마다 테두리 대신 구분선, 바꾸기는 오른쪽 위 글자).
 *
 * - 운동마다 고르기(기본 전부 켜짐) — 고른 것만 담는다.
 * - **주 버튼은 '더하기'**. 원래 운동을 내일로 미는 '바꾸기'는 되돌리기 어려워서 보조 버튼이고,
 *   누르면 이 자리에 확인 상자가 열린다(모달이 아니라 — 닫힘·이동이 겹치는 문제를 피한다).
 * - 무료는 '더하기'만.
 * 적용은 **오늘만 운동 변경으로만**(영구 루틴은 그대로, 원칙 2).
 */
export function FitApplyCard({ picks, canReplace }: { picks: FitPickView[]; canReplace: boolean }) {
  const router = useRouter();
  const [chosen, setChosen] = useState<Set<string>>(() => new Set(picks.map((p) => p.exerciseId)));
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const n = chosen.size;

  function toggle(id: string) {
    setChosen((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setConfirming(false);
  }

  function apply(mode: ApplyMode) {
    setError(null);
    setNotice(null);
    start(async () => {
      const r = await applyFitPicksAction(
        picks.filter((p) => chosen.has(p.exerciseId)).map((p) => ({ exerciseId: p.exerciseId, equipment: p.equipment })),
        mode,
      );
      if (!r.ok) {
        setConfirming(false);
        return setError(r.error);
      }
      if (r.added === 0) {
        setConfirming(false);
        return setNotice("이미 오늘 운동에 있어요.");
      }
      router.push("/routine");
    });
  }

  return (
    <section className="app-card p-4" data-testid="fit-picks">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">오늘 추천 {picks.length}개</h2>
        {canReplace && !confirming ? (
          <button
            type="button"
            data-testid="fit-replace"
            onClick={() => setConfirming(true)}
            disabled={pending || n === 0}
            className="text-xs font-semibold text-zinc-500 disabled:opacity-50 dark:text-zinc-400"
          >
            대신 이걸로 바꾸기
          </button>
        ) : null}
      </div>
      <ul className="mt-1 divide-y divide-[var(--line)]">
        {picks.map((p) => {
          const on = chosen.has(p.exerciseId);
          return (
            <li key={p.exerciseId} data-testid={`fit-pick-${p.exerciseId}`}>
              <label className={`flex cursor-pointer items-center gap-3 py-2.5 transition ${on ? "" : "opacity-50"}`}>
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle(p.exerciseId)}
                  disabled={pending}
                  className="h-[18px] w-[18px] shrink-0 accent-brand"
                  aria-label={`${p.name} 고르기`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{p.name}</span>
                  <span className="block truncate text-xs tabular-nums text-zinc-500 dark:text-zinc-400" data-testid="fit-pick-rx">
                    {p.prescription ?? p.equipmentLabel}
                  </span>
                </span>
                {p.fills[0] ? (
                  <span className="shrink-0 text-xs font-semibold text-brand">
                    {p.fills[0].label} +{p.fills[0].sets}
                  </span>
                ) : null}
              </label>
            </li>
          );
        })}
      </ul>

      {confirming ? (
        <div className="mt-2 space-y-2 rounded-xl bg-danger/5 p-3" data-testid="fit-replace-confirm">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">이 {n}개로 바꿀까요?</p>
          <p className="text-xs text-zinc-600 dark:text-zinc-300">원래 운동은 내일로 미뤄져요.</p>
          <div className="flex gap-2">
            <button
              type="button"
              data-testid="fit-replace-yes"
              onClick={() => apply("replace")}
              disabled={pending || n === 0}
              className="app-press inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-danger text-sm font-semibold text-white disabled:opacity-50"
            >
              {pending ? <Loader2 aria-hidden="true" size={15} className="animate-spin" /> : null}
              바꾸기
            </button>
            <button
              type="button"
              data-testid="fit-replace-no"
              onClick={() => setConfirming(false)}
              disabled={pending}
              className="h-10 flex-1 rounded-full border border-[var(--line)] text-sm font-semibold text-zinc-700 dark:text-zinc-200"
            >
              취소
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          data-testid="fit-add"
          onClick={() => apply("add")}
          disabled={pending || n === 0}
          className="app-press mt-2 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-brand text-sm font-semibold text-white disabled:opacity-50 dark:text-zinc-950"
        >
          {pending ? <Loader2 aria-hidden="true" size={16} className="animate-spin" /> : <Check aria-hidden="true" size={16} />}
          오늘 운동에 {n}개 더하기
        </button>
      )}

      {error ? (
        <p role="alert" className="mt-2 text-xs font-semibold text-danger">
          {error}
        </p>
      ) : null}
      {notice ? <p className="mt-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200">{notice}</p> : null}
    </section>
  );
}
