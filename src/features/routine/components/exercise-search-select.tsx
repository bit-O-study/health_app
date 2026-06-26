"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

import type { CatalogExercise } from "@/features/routine/exercise-catalog";

/**
 * 운동 선택 콤보박스 — 이름·부위로 검색해서 고른다.
 * 카탈로그가 길어(부위당 수십 개) 기본 <select> 로는 찾기 어려워, 검색 입력 +
 * 필터 목록을 단다. 접근성용 aria-label 은 기존 select 와 동일하게 유지.
 */
export function ExerciseSearchSelect({
  options,
  value,
  onChange,
  ariaLabel = "운동",
  disabled = false,
}: {
  options: CatalogExercise[];
  value: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.id === value);
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "");
  const nq = norm(q);
  const filtered = nq
    ? options.filter(
        (o) => norm(o.name).includes(nq) || norm(o.target).includes(nq),
      )
    : options;

  // 바깥 클릭 / ESC 로 닫기
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node))
        setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function pick(id: string) {
    onChange(id);
    setOpen(false);
    setQ("");
  }

  return (
    <div ref={rootRef} className="relative min-w-[9rem] flex-1">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-full items-center justify-between gap-1 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200 disabled:opacity-60"
      >
        <span className="truncate">{selected?.name ?? "운동 선택"}</span>
        <ChevronDown aria-hidden="true" size={15} className="shrink-0 text-zinc-400" />
      </button>

      {open ? (
        <div className="absolute left-0 z-30 mt-1 w-[min(20rem,82vw)] overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl">
          <div className="flex items-center gap-1.5 border-b border-zinc-100 dark:border-zinc-800 px-2.5 py-2">
            <Search aria-hidden="true" size={15} className="shrink-0 text-zinc-400" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="운동 검색 (이름·부위)"
              aria-label="운동 검색"
              className="h-7 w-full bg-transparent text-sm text-zinc-800 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
            />
            {q ? (
              <button
                type="button"
                aria-label="검색어 지우기"
                onClick={() => setQ("")}
                className="shrink-0 rounded p-0.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X aria-hidden="true" size={14} />
              </button>
            ) : null}
          </div>
          <ul role="listbox" className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-zinc-400">
                검색 결과 없음
              </li>
            ) : (
              filtered.map((o) => (
                <li key={o.id} role="option" aria-selected={o.id === value}>
                  <button
                    type="button"
                    onClick={() => pick(o.id)}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition hover:bg-emerald-50 dark:hover:bg-emerald-950/30 ${
                      o.id === value ? "bg-emerald-50/60 dark:bg-emerald-950/20" : ""
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                        {o.name}
                      </span>
                      <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                        {o.target}
                      </span>
                    </span>
                    {o.id === value ? (
                      <Check aria-hidden="true" size={15} className="shrink-0 text-emerald-600" />
                    ) : null}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
