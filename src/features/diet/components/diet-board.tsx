"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Trash2,
  Utensils,
  X,
} from "lucide-react";

import { addDaysYmd, ymdDisplay } from "@/features/routine/data";
import {
  MEALS,
  MEAL_LABEL,
  type FoodLog,
  type Meal,
} from "@/features/diet/meal";
import {
  addFoodLogAction,
  deleteFoodLogAction,
  type FoodInput,
} from "@/features/diet/diet-actions";
import { searchFoods, type FoodItem } from "@/features/diet/food-catalog";
import type { MacroTarget } from "@/features/diet/calorie-target";

const MEAL_ICON: Record<Meal, string> = {
  breakfast: "🌅",
  lunch: "🍱",
  dinner: "🍽️",
  snack: "🍎",
};

export function DietBoard({
  date,
  today,
  logs: initial,
  target,
}: {
  date: string;
  today: string;
  logs: FoodLog[];
  target: MacroTarget;
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const [logs, setLogs] = useState<FoodLog[]>(initial);
  const [adding, setAdding] = useState<Meal | null>(null);

  const totals = useMemo(() => {
    let kcal = 0,
      protein = 0,
      carbs = 0,
      fat = 0;
    for (const l of logs) {
      kcal += l.kcal;
      protein += l.protein ?? 0;
      carbs += l.carbs ?? 0;
      fat += l.fat ?? 0;
    }
    return {
      kcal: Math.round(kcal),
      protein: Math.round(protein),
      carbs: Math.round(carbs),
      fat: Math.round(fat),
    };
  }, [logs]);

  const { label } = ymdDisplay(date);
  const isToday = date === today;

  function goDay(delta: number) {
    const d = addDaysYmd(date, delta);
    router.push(d === today ? "/diet" : `/diet?d=${d}`);
  }

  function addFood(meal: Meal, input: FoodInput) {
    const tempId = `tmp-${Date.now()}-${Math.round(logs.length)}`;
    const optimistic: FoodLog = {
      id: tempId,
      meal,
      position: 1_000_000,
      name: input.name,
      kcal: input.kcal,
      protein: input.protein,
      carbs: input.carbs,
      fat: input.fat,
      amount: input.amount,
    };
    setLogs((prev) => [...prev, optimistic]);
    start(async () => {
      const res = await addFoodLogAction(input, date);
      if (res.ok && res.id) {
        setLogs((prev) =>
          prev.map((l) => (l.id === tempId ? { ...l, id: res.id! } : l)),
        );
      } else if (!res.ok) {
        setLogs((prev) => prev.filter((l) => l.id !== tempId));
      }
      router.refresh();
    });
  }

  function removeFood(id: string) {
    const prev = logs;
    setLogs((cur) => cur.filter((l) => l.id !== id));
    start(async () => {
      const res = await deleteFoodLogAction(id);
      if (!res.ok) setLogs(prev);
      else router.refresh();
    });
  }

  return (
    <section className="space-y-5">
      {/* 헤더 + 날짜 네비 */}
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold text-zinc-950 dark:text-zinc-50">
          <Utensils aria-hidden="true" size={22} className="text-emerald-600" />
          식단
        </h1>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="이전 날"
            onClick={() => goDay(-1)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <ChevronLeft aria-hidden="true" size={18} />
          </button>
          <span className="min-w-[4.5rem] text-center text-sm font-bold text-zinc-700 dark:text-zinc-200">
            {isToday ? "오늘" : label}
          </span>
          <button
            type="button"
            aria-label="다음 날"
            onClick={() => goDay(1)}
            disabled={isToday}
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 disabled:opacity-30 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <ChevronRight aria-hidden="true" size={18} />
          </button>
        </div>
      </div>

      {/* 요약 카드 — 칼로리 링 + 탄단지 바 */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-5">
          <KcalRing consumed={totals.kcal} target={target.kcal} />
          <div className="min-w-0 flex-1 space-y-2.5">
            <MacroBar label="단백질" consumed={totals.protein} target={target.protein} color="#10b981" />
            <MacroBar label="탄수화물" consumed={totals.carbs} target={target.carbs} color="#f59e0b" />
            <MacroBar label="지방" consumed={totals.fat} target={target.fat} color="#ef4444" />
          </div>
        </div>
      </div>

      {/* 끼니별 섹션 */}
      <div className="space-y-3">
        {MEALS.map((meal) => (
          <MealSection
            key={meal}
            meal={meal}
            items={logs.filter((l) => l.meal === meal)}
            onAdd={() => setAdding(meal)}
            onDelete={removeFood}
          />
        ))}
      </div>

      {adding ? (
        <AddFoodDialog
          meal={adding}
          onClose={() => setAdding(null)}
          onAdd={(input) => addFood(adding, input)}
        />
      ) : null}
    </section>
  );
}

function KcalRing({ consumed, target }: { consumed: number; target: number }) {
  const pct = target > 0 ? Math.min(1, consumed / target) : 0;
  const over = target > 0 && consumed > target;
  const R = 34;
  const C = 2 * Math.PI * R;
  const remain = Math.max(0, target - consumed);
  return (
    <div className="relative flex h-[88px] w-[88px] shrink-0 items-center justify-center">
      <svg viewBox="0 0 80 80" className="h-[88px] w-[88px] -rotate-90">
        <circle cx="40" cy="40" r={R} fill="none" stroke="currentColor" strokeWidth="8" className="text-zinc-200 dark:text-zinc-800" />
        <circle
          cx="40"
          cy="40"
          r={R}
          fill="none"
          stroke={over ? "#ef4444" : "#10b981"}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - pct)}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-lg font-extrabold tabular-nums text-zinc-950 dark:text-zinc-50">
          {consumed}
        </span>
        <span className="text-[10px] font-semibold text-zinc-400">
          / {target}
        </span>
      </div>
      <span className="absolute -bottom-0.5 whitespace-nowrap text-[10px] font-bold text-zinc-400">
        {over ? `+${consumed - target}` : `${remain} 남음`}
      </span>
    </div>
  );
}

function MacroBar({
  label,
  consumed,
  target,
  color,
}: {
  label: string;
  consumed: number;
  target: number;
  color: string;
}) {
  const pct = target > 0 ? Math.min(100, (consumed / target) * 100) : 0;
  return (
    <div>
      <div className="mb-0.5 flex items-baseline justify-between text-xs">
        <span className="font-semibold text-zinc-600 dark:text-zinc-300">{label}</span>
        <span className="tabular-nums text-zinc-500 dark:text-zinc-400">
          {consumed} / {target}g
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function MealSection({
  meal,
  items,
  onAdd,
  onDelete,
}: {
  meal: Meal;
  items: FoodLog[];
  onAdd: () => void;
  onDelete: (id: string) => void;
}) {
  const sub = Math.round(items.reduce((s, i) => s + i.kcal, 0));
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-zinc-900 dark:text-zinc-100">
          <span aria-hidden="true">{MEAL_ICON[meal]}</span>
          {MEAL_LABEL[meal]}
          {sub > 0 ? (
            <span className="ml-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
              {sub} kcal
            </span>
          ) : null}
        </h2>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex h-7 items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          <Plus aria-hidden="true" size={13} />
          추가
        </button>
      </div>
      {items.length === 0 ? (
        <p className="py-2 text-center text-xs text-zinc-400 dark:text-zinc-500">
          아직 기록이 없어요
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {items.map((it) => (
            <li key={it.id} className="flex items-center gap-2 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                  {it.name}
                  {it.amount ? (
                    <span className="ml-1.5 text-xs font-normal text-zinc-400">
                      {it.amount}
                    </span>
                  ) : null}
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {Math.round(it.kcal)}kcal
                  {it.protein != null ? ` · 단 ${Math.round(it.protein)}` : ""}
                  {it.carbs != null ? ` · 탄 ${Math.round(it.carbs)}` : ""}
                  {it.fat != null ? ` · 지 ${Math.round(it.fat)}` : ""}
                </p>
              </div>
              <button
                type="button"
                aria-label="삭제"
                onClick={() => onDelete(it.id)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
              >
                <Trash2 aria-hidden="true" size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AddFoodDialog({
  meal,
  onClose,
  onAdd,
}: {
  meal: Meal;
  onClose: () => void;
  onAdd: (input: FoodInput) => void;
}) {
  const [mode, setMode] = useState<"search" | "manual">("search");
  const [q, setQ] = useState("");
  const results = useMemo(() => searchFoods(q).slice(0, 40), [q]);
  const [added, setAdded] = useState<Set<string>>(() => new Set());

  function addCatalog(f: FoodItem) {
    onAdd({
      meal,
      name: f.name,
      kcal: f.kcal,
      protein: f.protein,
      carbs: f.carbs,
      fat: f.fat,
      amount: f.amount,
    });
    setAdded((s) => new Set(s).add(f.id));
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-zinc-50 dark:bg-zinc-950">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 pb-2 pt-[max(env(safe-area-inset-top),0.75rem)] dark:border-zinc-800">
        <span className="text-base font-bold text-zinc-900 dark:text-zinc-100">
          {MEAL_LABEL[meal]} 추가
        </span>
        <button
          type="button"
          aria-label="닫기"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
        >
          <X aria-hidden="true" size={18} />
        </button>
      </div>

      <div className="flex gap-1 px-4 pt-3">
        {(["search", "manual"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`h-9 flex-1 rounded-lg text-sm font-bold transition ${
              mode === m
                ? "bg-emerald-600 text-white"
                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
            }`}
          >
            {m === "search" ? "검색" : "직접 입력"}
          </button>
        ))}
      </div>

      {mode === "search" ? (
        <>
          <div className="mx-4 mt-3 flex items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-900">
            <Search aria-hidden="true" size={16} className="shrink-0 text-zinc-400" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="음식 검색 (예: 닭가슴살, 김치찌개)"
              aria-label="음식 검색"
              className="h-11 w-full bg-transparent text-base outline-none placeholder:text-zinc-400 dark:text-zinc-100"
            />
          </div>
          <ul className="mt-2 flex-1 divide-y divide-zinc-100 overflow-y-auto px-4 pb-6 dark:divide-zinc-800">
            {results.length === 0 ? (
              <li className="py-10 text-center text-sm text-zinc-400">
                검색 결과가 없어요. ‘직접 입력’으로 추가하세요.
              </li>
            ) : (
              results.map((f) => (
                <li key={f.id} className="flex items-center gap-2 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                      {f.name}
                      <span className="ml-1.5 text-xs font-normal text-zinc-400">
                        {f.amount}
                      </span>
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {f.kcal}kcal · 단 {f.protein} · 탄 {f.carbs} · 지 {f.fat}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`${f.name} 추가`}
                    onClick={() => addCatalog(f)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white transition hover:bg-emerald-500"
                  >
                    <Plus aria-hidden="true" size={16} />
                  </button>
                  {added.has(f.id) ? (
                    <span className="text-[11px] font-bold text-emerald-600">담음</span>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        </>
      ) : (
        <ManualForm
          onSubmit={(input) => {
            onAdd(input);
            onClose();
          }}
        />
      )}
    </div>
  );

  function ManualForm({ onSubmit }: { onSubmit: (i: FoodInput) => void }) {
    const [name, setName] = useState("");
    const [kcal, setKcal] = useState("");
    const [protein, setProtein] = useState("");
    const [carbs, setCarbs] = useState("");
    const [fat, setFat] = useState("");
    const [amount, setAmount] = useState("");
    const numOrNull = (s: string) => (s.trim() === "" ? null : Number(s));
    const valid = name.trim() !== "" && kcal.trim() !== "" && Number(kcal) >= 0;
    const field =
      "h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-base outline-none focus:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";
    return (
      <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-8 pt-3">
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-zinc-500">음식 이름</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 직접 만든 도시락" className={field} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-zinc-500">칼로리(kcal)</span>
            <input value={kcal} onChange={(e) => setKcal(e.target.value)} type="number" inputMode="numeric" placeholder="0" className={field} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-zinc-500">양(선택)</span>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="예: 1인분" className={field} />
          </label>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-zinc-500">단백질</span>
            <input value={protein} onChange={(e) => setProtein(e.target.value)} type="number" inputMode="decimal" placeholder="g" className={field} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-zinc-500">탄수화물</span>
            <input value={carbs} onChange={(e) => setCarbs(e.target.value)} type="number" inputMode="decimal" placeholder="g" className={field} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-zinc-500">지방</span>
            <input value={fat} onChange={(e) => setFat(e.target.value)} type="number" inputMode="decimal" placeholder="g" className={field} />
          </label>
        </div>
        <button
          type="button"
          disabled={!valid}
          onClick={() =>
            onSubmit({
              meal,
              name,
              kcal: Number(kcal),
              protein: numOrNull(protein),
              carbs: numOrNull(carbs),
              fat: numOrNull(fat),
              amount: amount.trim() || null,
            })
          }
          className="h-12 w-full rounded-xl bg-emerald-600 text-base font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
        >
          추가하기
        </button>
      </div>
    );
  }
}
