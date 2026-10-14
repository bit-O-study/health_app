"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Plus, Search } from "lucide-react";

import {
  addExercisesTodayAction,
  findExercisesToAddAction,
  type AddCandidate,
} from "@/features/routine/today-add-actions";

/** 처음 열었을 때 눌러 볼 수 있는 찾기 예시 — 이름을 몰라도 시작할 수 있게. */
const SUGGESTIONS = ["가슴", "등", "어깨", "하체", "코어", "가동성"];

/**
 * 오늘만 바꾸기 → 운동 더하기(2026-10-14).
 * 운동을 찾아 여러 개 고른 뒤 한 번에 오늘에 더한다. 지금 오늘 운동과 루틴은 그대로다.
 * (예전엔 운동 하나를 더하려면 부위를 고르고 편집 화면으로 넘어가야 했다.)
 */
export function TodayAddPicker() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AddCandidate[] | null>(null);
  const [picked, setPicked] = useState<AddCandidate[]>([]);
  const [note, setNote] = useState("");
  const [searching, startSearch] = useTransition();
  const [saving, startSave] = useTransition();

  function search(q: string) {
    const text = q.trim();
    if (!text) return;
    setNote("");
    startSearch(async () => {
      try {
        setResults(await findExercisesToAddAction(text));
      } catch {
        setResults(null);
        setNote("찾지 못했어요. 연결을 확인하고 다시 시도해 주세요.");
      }
    });
  }

  function toggle(c: AddCandidate) {
    setPicked((prev) => (prev.some((p) => p.exerciseId === c.exerciseId) ? prev.filter((p) => p.exerciseId !== c.exerciseId) : [...prev, c]));
  }

  function add() {
    if (picked.length === 0 || saving) return;
    setNote("");
    startSave(async () => {
      try {
        const r = await addExercisesTodayAction(picked.map((p) => ({ exerciseId: p.exerciseId, equipment: p.equipment })));
        if (!r.ok) {
          setNote(r.error);
          return;
        }
        if (r.added === 0) {
          setNote("고른 운동이 이미 오늘 운동에 있어요.");
          return;
        }
        // 모달 back()이 갱신된 화면을 되돌리지 않도록 문서를 다시 읽는다(시트의 다른 동작과 같다).
        window.location.reload();
      } catch {
        setNote("담지 못했어요. 연결을 확인하고 다시 시도해 주세요.");
      }
    });
  }

  return (
    <div className="mt-4 space-y-3" data-testid="today-add-picker">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          search(query);
        }}
      >
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">더할 운동 찾기</span>
          <Search aria-hidden="true" size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="운동 이름 · 부위로 찾기"
            className="h-11 w-full rounded-xl border app-field pl-9 pr-3 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={searching || !query.trim()}
          className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl border border-brand/40 px-4 text-sm font-semibold text-brand disabled:opacity-50"
        >
          {searching ? <Loader2 aria-hidden="true" size={15} className="animate-spin" /> : "찾기"}
        </button>
      </form>

      {results === null ? (
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              disabled={searching}
              onClick={() => {
                setQuery(s);
                search(s);
              }}
              className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-brand/40 hover:bg-brand-soft dark:border-zinc-700 dark:text-zinc-300"
            >
              {s}
            </button>
          ))}
        </div>
      ) : results.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">찾는 운동이 없어요. 다른 이름이나 부위로 찾아 보세요.</p>
      ) : (
        <ul className="space-y-1.5" data-testid="today-add-results">
          {results.map((c) => {
            const on = picked.some((p) => p.exerciseId === c.exerciseId);
            return (
              <li key={c.exerciseId}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(c)}
                  data-testid={`today-add-${c.exerciseId}`}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                    on ? "border-brand/40 bg-brand-soft" : "border-zinc-200 hover:border-brand/40 dark:border-zinc-700"
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-zinc-950 dark:text-zinc-100">{c.name}</span>
                    <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                      {c.target}
                      {c.equipmentLabel ? ` · ${c.equipmentLabel}` : ""}
                    </span>
                  </span>
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                      on ? "bg-brand text-white dark:text-zinc-950" : "bg-zinc-100 text-zinc-500 dark:bg-white/10 dark:text-zinc-300"
                    }`}
                  >
                    {on ? <Check aria-hidden="true" size={15} /> : <Plus aria-hidden="true" size={15} />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {picked.length > 0 ? (
        <p className="text-xs text-zinc-600 dark:text-zinc-300" data-testid="today-add-picked">
          담은 운동 {picked.length}개 · {picked.map((p) => p.name).join(", ")}
        </p>
      ) : null}
      {note ? (
        <p role="status" className="text-sm font-semibold text-warn">
          {note}
        </p>
      ) : null}
      <button
        type="button"
        disabled={picked.length === 0 || saving}
        onClick={add}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-zinc-300 dark:text-zinc-950 dark:disabled:bg-zinc-700"
      >
        {saving ? <Loader2 aria-hidden="true" size={15} className="animate-spin" /> : null}
        {picked.length > 0 ? `${picked.length}개 오늘만 담기` : "담을 운동을 골라 주세요"}
      </button>
      <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">
        지금 오늘 운동에 더해요. 세트·무게는 내 기록에 맞춰 넣고, 루틴은 그대로예요.
      </p>
    </div>
  );
}
