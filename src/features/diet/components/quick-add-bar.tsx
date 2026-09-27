"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, Plus, Star } from "lucide-react";

import { MEALS, MEAL_LABEL, type Meal } from "@/features/diet/meal";
import type { FoodInput } from "@/features/diet/diet-actions";
import {
  copyMealLabel,
  copyMealSummary,
  lastMealOf,
  mealByHour,
  nowSeoulHHMM,
  quickFoodInput,
  rankQuickFoods,
  type RecentFood,
} from "@/features/diet/quick-add";

/**
 * 빠른 기록 — **자주 먹는 것 한 번에 담기**(2026-09-25 식단 UI 리뉴얼).
 *
 * 기록이 안 쌓이는 이유는 의지가 아니라 탭 수였다. 같은 닭가슴살을 매일
 * `추가 → 검색 → 입력 → 고르기 → 양 → 담기` 6단계로 넣게 했으니까.
 * 여기서는 **칩 한 번**이면 끝이고, 어제 먹은 끼니는 통째로 복사한다.
 *
 * 끼니는 시계를 보고 기본값을 고른다(아침에 열면 '아침'). 틀리면 위 칩에서 바꾼다 —
 * 물어보지 않고 고쳐 쓸 수 있게 하는 쪽이, 매번 고르게 하는 것보다 빠르다.
 */
export function QuickAddBar({
  recent,
  today,
  date,
  onAdd,
  onCopy,
}: {
  recent: RecentFood[];
  today: string;
  /** 지금 보고 있는 날짜 — 오늘이 아니면 시간은 안 붙인다(그날 몇 시였는지 모른다). */
  date: string;
  onAdd: (meal: Meal, input: FoodInput) => void;
  onCopy: (meal: Meal, fromYmd: string) => void;
}) {
  const isToday = date === today;
  // 기본 끼니는 **첫 렌더에 한 번만** 고른다. 매 렌더마다 시계를 보면 사용자가 고른
  // 끼니가 자정이나 리렌더 때 조용히 바뀐다.
  const [meal, setMeal] = useState<Meal>(() =>
    isToday ? mealByHour(nowSeoulHHMM()) : "breakfast",
  );
  const [added, setAdded] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const foods = useMemo(
    () => rankQuickFoods(recent, { meal, today: date }),
    [recent, meal, date],
  );
  const source = useMemo(() => lastMealOf(recent, meal), [recent, meal]);

  function pick(key: string, input: FoodInput) {
    onAdd(meal, input);
    setAdded(key);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setAdded(null), 1200);
  }

  return (
    <section aria-label="빠른 기록" data-testid="quick-add" className="app-card px-3 py-3">
      <div className="flex items-center gap-1.5">
        <Star aria-hidden="true" size={14} className="text-brand" />
        <h2 className="text-sm font-semibold">빠른 기록</h2>
        <span className="text-xs text-zinc-400">검색 없이 한 번에</span>
      </div>

      {/* 어느 끼니에 담을지 — 시계가 고른 기본값이 이미 눌려 있다. */}
      <div role="group" aria-label="담을 끼니" className="mt-2 flex gap-1">
        {MEALS.map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={meal === m}
            data-testid="quick-meal"
            onClick={() => setMeal(m)}
            className={`app-press h-8 flex-1 rounded-full text-xs font-semibold transition ${
              meal === m
                ? "bg-brand text-white dark:text-zinc-950"
                : "bg-zinc-100 text-zinc-500 dark:bg-white/[0.08] dark:text-zinc-300"
            }`}
          >
            {MEAL_LABEL[m]}
          </button>
        ))}
      </div>

      {foods.length === 0 ? (
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          며칠 기록하면 자주 먹는 음식이 여기 모여요 — 그다음부터는 한 번에 담을 수 있어요.
        </p>
      ) : (
        <ul className="mt-2.5 flex flex-wrap gap-1.5">
          {foods.map((f) => {
            const done = added === f.key;
            return (
              <li key={f.key}>
                <button
                  type="button"
                  data-testid="quick-food"
                  onClick={() =>
                    pick(
                      f.key,
                      quickFoodInput(f, meal, isToday ? nowSeoulHHMM() : null),
                    )
                  }
                  aria-label={`${f.name} ${MEAL_LABEL[meal]}에 담기`}
                  className={`app-press inline-flex h-9 max-w-[16rem] items-center gap-1 rounded-full px-3 text-xs font-semibold transition ${
                    done
                      ? "bg-brand text-white dark:text-zinc-950"
                      : "bg-zinc-100 text-zinc-700 dark:bg-white/[0.08] dark:text-zinc-200"
                  }`}
                >
                  {done ? (
                    <Check aria-hidden="true" size={13} />
                  ) : (
                    <Plus aria-hidden="true" size={13} className="text-zinc-400" />
                  )}
                  <span className="truncate">{f.name}</span>
                  <span className={done ? "opacity-80" : "text-zinc-400"}>
                    {Math.round(f.kcal)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {source ? (
        <button
          type="button"
          data-testid="quick-copy"
          onClick={() => onCopy(meal, source.date)}
          className="app-press mt-2.5 flex w-full items-center gap-2 rounded-xl border border-dashed border-zinc-300 px-3 py-2 text-left dark:border-zinc-600"
        >
          <Copy aria-hidden="true" size={14} className="shrink-0 text-zinc-400" />
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200">
              {copyMealLabel(meal, source.date, date)}
            </span>
            <span className="block truncate text-xs text-zinc-400">
              {copyMealSummary(source.items)}
            </span>
          </span>
        </button>
      ) : null}
    </section>
  );
}
