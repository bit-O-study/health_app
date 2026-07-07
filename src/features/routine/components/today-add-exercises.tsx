"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Dumbbell, Loader2, Search, X } from "lucide-react";

import { searchExercises } from "@/features/routine/exercise-search";
import {
  allExercisesGrouped,
  getCatalogExercise,
} from "@/features/routine/exercise-catalog";
import { addExercisesTodayOnlyAction } from "@/features/routine/daily-plan-actions";

type Row = { id: string; name: string; target: string };

/**
 * "오늘만 — 운동 직접 담기(다중선택)". 전체 운동을 검색·둘러보며 여러 개 체크해
 * 오늘 하루만 추가한다. 루틴 원본은 안 바뀐다(addExercisesTodayOnlyAction 이 daily_plan 만 씀).
 */
export function TodayAddExercises() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const all = useMemo<Row[]>(() => {
    const seen = new Set<string>();
    const out: Row[] = [];
    for (const g of allExercisesGrouped()) {
      for (const ex of g.exercises) {
        if (seen.has(ex.id)) continue;
        seen.add(ex.id);
        out.push({ id: ex.id, name: ex.name, target: ex.target });
      }
    }
    return out.sort((a, b) => a.name.localeCompare(b.name, "ko"));
  }, []);

  const results = useMemo<Row[]>(() => {
    const query = q.trim();
    if (!query) return all;
    return searchExercises(query, 60).map((h) => ({
      id: h.id,
      name: h.name,
      target: getCatalogExercise(h.id)?.target ?? "",
    }));
  }, [q, all]);

  function close() {
    if (pending) return;
    setOpen(false);
    setQ("");
    setSelected(new Set());
    setError(null);
  }
  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function apply() {
    if (selected.size === 0) return;
    const items = [...selected].map((id) => ({
      exerciseId: id,
      equipment: getCatalogExercise(id)?.equipments[0].equipment ?? "barbell",
    }));
    start(async () => {
      const r = await addExercisesTodayOnlyAction(items);
      if (r.ok) {
        close();
        router.refresh();
      } else {
        setError(r.error);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
      >
        <Dumbbell aria-hidden="true" size={14} />
        운동 직접 담기
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
          onClick={close}
        >
          <div
            className="flex max-h-[85dvh] w-full max-w-md flex-col rounded-t-2xl bg-white dark:bg-zinc-900 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 px-4 pb-2 pt-4">
              <div>
                <h2 className="text-base font-extrabold text-zinc-950 dark:text-zinc-100">
                  운동 직접 담기
                </h2>
                <p className="text-[11px] text-zinc-400">
                  오늘 하루만 추가돼요. 루틴은 안 바뀝니다.
                </p>
              </div>
              <button
                type="button"
                aria-label="닫기"
                onClick={close}
                className="rounded-full p-1 text-zinc-400"
              >
                <X aria-hidden="true" size={20} />
              </button>
            </div>

            {/* 검색 */}
            <div className="mx-4 mt-3 flex items-center gap-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3">
              <Search aria-hidden="true" size={16} className="shrink-0 text-zinc-400" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="운동 검색 (예: 스쿼트, 벤치프레스)"
                aria-label="운동 검색"
                className="h-11 w-full bg-transparent text-base outline-none placeholder:text-zinc-400 dark:text-zinc-100"
              />
            </div>

            {/* 목록 */}
            <ul className="mt-2 flex-1 divide-y divide-zinc-100 dark:divide-zinc-800 overflow-y-auto px-4">
              {results.length === 0 ? (
                <li className="py-10 text-center text-sm text-zinc-400">
                  검색 결과가 없어요.
                </li>
              ) : (
                results.map((r) => {
                  const on = selected.has(r.id);
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => toggle(r.id)}
                        aria-pressed={on}
                        className="flex w-full items-center gap-2.5 py-2.5 text-left"
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                            on
                              ? "border-emerald-500 bg-emerald-500 text-white"
                              : "border-zinc-300 dark:border-zinc-600"
                          }`}
                        >
                          {on ? <Check aria-hidden="true" size={13} /> : null}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                            {r.name}
                          </span>
                          {r.target ? (
                            <span className="block truncate text-[11px] text-zinc-400">
                              {r.target}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>

            {/* 하단 적용 */}
            <div className="border-t border-zinc-100 dark:border-zinc-800 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
              {error ? (
                <p className="mb-2 text-xs font-bold text-rose-500">{error}</p>
              ) : null}
              <button
                type="button"
                onClick={apply}
                disabled={pending || selected.size === 0}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-extrabold text-white transition hover:bg-emerald-500 disabled:bg-zinc-300 dark:disabled:bg-zinc-700"
              >
                {pending ? (
                  <Loader2 aria-hidden="true" size={18} className="animate-spin" />
                ) : null}
                오늘만 담기{selected.size > 0 ? ` (${selected.size})` : ""}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
