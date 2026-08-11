"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search, X } from "lucide-react";

import { DAY_BLOCKS, isDayBlockId } from "@/features/routine/data";
import { focusForExercise } from "@/features/routine/exercise-catalog";
import { subMusclesForExercise } from "@/features/routine/muscle-detail";
import { muscleGroup } from "@/features/routine/muscle-map";

/** 검색 선택 항목 — 본운동(CatalogExercise)·컨디셔닝(ConditioningItem) 공용 최소 형태. */
export type SearchOption = { id: string; name: string; target?: string };

/**
 * 운동 선택 콤보박스 — 이름·부위로 검색해서 고른다.
 * 카탈로그가 길어(부위당 수십 개) 기본 <select> 로는 찾기 어려워, 검색 입력 +
 * 필터 목록을 단다.
 *
 * 열린 목록은 body 로 포털한 풀스크린 시트로 띄운다 — 모바일에서 absolute 드롭다운이
 * 화면 밖으로 넘치거나(가로 스크롤) 좁은 폭에서 레이아웃이 깨지던 문제를 없앤다.
 * 접근성용 aria-label 은 기존 select 와 동일하게 유지(트리거=운동, 입력=운동 검색).
 */
export function ExerciseSearchSelect({
  options,
  value,
  onChange,
  ariaLabel = "운동",
  disabled = false,
  muscleFilter = false,
}: {
  options: SearchOption[];
  value: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
  disabled?: boolean;
  /** 본운동 선택기 — 부위(focus)→세부근육 칩으로 좁혀 고를 수 있게 한다.
   * 컨디셔닝 등 근육 개념이 없는 선택기에선 false(기본). */
  muscleFilter?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [q, setQ] = useState("");
  const [focusPick, setFocusPick] = useState<string | null>(null);
  const [subPick, setSubPick] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 포털은 클라이언트에서만 — document 접근 가드.
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!disabled) return;
    const closeTimer = window.setTimeout(() => setOpen(false), 0);
    return () => window.clearTimeout(closeTimer);
  }, [disabled]);

  const selected = options.find((o) => o.id === value);
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "");
  const nq = norm(q);

  // 운동별 부위·세부근육 메타 — muscleFilter 일 때만 계산(컨디셔닝은 스킵).
  const meta = useMemo(() => {
    if (!muscleFilter) return [];
    return options.map((o) => ({
      o,
      focus: focusForExercise(o.id),
      subs: subMusclesForExercise(o.id),
    }));
  }, [options, muscleFilter]);

  // 목록에 실제로 존재하는 부위들(2개 이상일 때만 부위 칩 노출 — 직접 담기 등).
  const focusChips = useMemo(() => {
    if (!muscleFilter) return [] as string[];
    const seen = new Set<string>();
    for (const m of meta) if (m.focus && isDayBlockId(m.focus)) seen.add(m.focus);
    return [...seen];
  }, [meta, muscleFilter]);

  // 현재 부위 선택 기준으로 존재하는 세부근육 칩(등장 순서·중복 제거).
  const subChips = useMemo(() => {
    if (!muscleFilter) return [] as { id: string; label: string; muscle: string }[];
    const scope = focusPick ? meta.filter((m) => m.focus === focusPick) : meta;
    const seen = new Set<string>();
    const out: { id: string; label: string; muscle: string }[] = [];
    for (const m of scope)
      for (const s of m.subs)
        if (!seen.has(s.id)) {
          seen.add(s.id);
          out.push({ id: s.id, label: s.label, muscle: s.muscle });
        }
    return out;
  }, [meta, focusPick, muscleFilter]);

  const filtered = (() => {
    if (!muscleFilter) {
      return nq
        ? options.filter(
            (o) =>
              norm(o.name).includes(nq) || norm(o.target ?? "").includes(nq),
          )
        : options;
    }
    return meta
      .filter((m) => {
        if (focusPick && m.focus !== focusPick) return false;
        if (subPick && !m.subs.some((s) => s.id === subPick)) return false;
        if (nq && !(norm(m.o.name).includes(nq) || norm(m.o.target ?? "").includes(nq)))
          return false;
        return true;
      })
      .map((m) => m.o);
  })();

  // 열려 있는 동안 ESC 로 닫기 + 배경 스크롤 잠금.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // 부위(focus)를 바꾸면 그 부위에 없는 세부근육 선택은 해제.
  useEffect(() => {
    if (!subPick) return;
    if (!subChips.some((s) => s.id === subPick)) setSubPick(null);
  }, [subPick, subChips]);

  function pick(id: string) {
    if (disabled) return;
    onChange(id);
    setOpen(false);
    setQ("");
  }

  return (
    <div className="min-w-[9rem] flex-1">
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

      {open && mounted && !disabled
        ? createPortal(
            <div
              className="fixed inset-0 z-[80] flex flex-col"
              role="dialog"
              aria-modal="true"
            >
              <button
                type="button"
                aria-label="닫기"
                onClick={() => setOpen(false)}
                className="absolute inset-0 h-full w-full cursor-default bg-black/40"
              />
              <div className="relative mx-auto mt-[max(env(safe-area-inset-top),0.75rem)] flex max-h-[85vh] w-[min(28rem,94vw)] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
                <div className="flex items-center gap-1.5 border-b border-zinc-100 px-3 py-2.5 dark:border-zinc-800">
                  <Search aria-hidden="true" size={16} className="shrink-0 text-zinc-400" />
                  <input
                    ref={inputRef}
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="운동 검색 (이름·부위)"
                    aria-label="운동 검색"
                    className="h-8 w-full bg-transparent text-base text-zinc-800 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
                  />
                  <button
                    type="button"
                    aria-label="닫기"
                    onClick={() => setOpen(false)}
                    className="shrink-0 rounded-md p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <X aria-hidden="true" size={18} />
                  </button>
                </div>
                {muscleFilter && (focusChips.length > 1 || subChips.length > 0) ? (
                  <div className="space-y-1.5 border-b border-zinc-100 px-3 py-2 dark:border-zinc-800">
                    {/* 부위 칩 — 목록이 여러 부위를 걸칠 때(직접 담기)만 */}
                    {focusChips.length > 1 ? (
                      <div
                        className="flex flex-wrap gap-1.5"
                        role="group"
                        aria-label="부위 선택"
                      >
                        <FilterChip
                          label="전체 부위"
                          active={focusPick === null}
                          onClick={() => {
                            setFocusPick(null);
                            setSubPick(null);
                          }}
                        />
                        {focusChips.map((f) => (
                          <FilterChip
                            key={f}
                            label={isDayBlockId(f) ? DAY_BLOCKS[f].label : f}
                            active={focusPick === f}
                            color={muscleGroupColor(f)}
                            onClick={() => {
                              setFocusPick(focusPick === f ? null : f);
                              setSubPick(null);
                            }}
                          />
                        ))}
                      </div>
                    ) : null}
                    {/* 세부근육 칩 — 현재 부위 안에서 더 좁히기 */}
                    {subChips.length > 0 ? (
                      <div
                        className="flex flex-wrap gap-1.5"
                        role="group"
                        aria-label="세부 근육 선택"
                      >
                        <FilterChip
                          label="세부 전체"
                          active={subPick === null}
                          onClick={() => setSubPick(null)}
                        />
                        {subChips.map((s) => (
                          <FilterChip
                            key={s.id}
                            label={s.label}
                            active={subPick === s.id}
                            color={muscleGroupColor(s.muscle)}
                            onClick={() =>
                              setSubPick(subPick === s.id ? null : s.id)
                            }
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                <ul role="listbox" className="flex-1 overflow-y-auto overscroll-contain py-1">
                  {filtered.length === 0 ? (
                    <li className="px-3 py-8 text-center text-sm text-zinc-400">
                      검색 결과 없음
                    </li>
                  ) : (
                    filtered.map((o) => (
                      <li key={o.id} role="option" aria-selected={o.id === value}>
                        <button
                          type="button"
                          onClick={() => pick(o.id)}
                          className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition hover:bg-emerald-50 dark:hover:bg-emerald-950/30 ${
                            o.id === value
                              ? "bg-emerald-50/60 dark:bg-emerald-950/20"
                              : ""
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
                            <Check
                              aria-hidden="true"
                              size={16}
                              className="shrink-0 text-emerald-600"
                            />
                          ) : null}
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

/** 부위/세부근육 필터 칩(muscleGroup 이 모르는 focus 는 색 없이). */
function muscleGroupColor(id: string): string | undefined {
  try {
    return muscleGroup(id as never)?.color;
  } catch {
    return undefined;
  }
}

function FilterChip({
  label,
  active,
  color,
  onClick,
}: {
  label: string;
  active: boolean;
  color?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
        active
          ? "border-transparent text-white"
          : "border-zinc-300 bg-white text-zinc-600 hover:border-zinc-400 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
      }`}
      style={active ? { backgroundColor: color ?? "#059669" } : undefined}
    >
      {color ? (
        <span
          aria-hidden
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: active ? "#fff" : color }}
        />
      ) : null}
      {label}
    </button>
  );
}
