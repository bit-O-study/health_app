"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Images,
  Loader2,
  MoreHorizontal,
  Pencil,
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
  wrapIndex,
  type FoodLog,
  type Meal,
} from "@/features/diet/meal";
import {
  addFoodLogAction,
  deleteFoodLogAction,
  deleteMealAction,
  updateFoodLogAction,
  type FoodInput,
} from "@/features/diet/diet-actions";
import {
  addMealPhotoAction,
  clearMealPhotosAction,
  removeMealPhotoAction,
} from "@/features/diet/meal-photo-actions";
import {
  searchFoods,
  FOOD_CATEGORIES,
  type FoodItem,
} from "@/features/diet/food-catalog";
import { uploadFoodPhoto } from "@/features/diet/upload-photo";
import type { MacroTarget } from "@/features/diet/calorie-target";

const MEAL_ICON: Record<Meal, string> = {
  breakfast: "🌅",
  lunch: "🍱",
  dinner: "🍽️",
  snack: "🍎",
};

/** "08:30" → "오전 8:30". */
function fmtClock(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const ampm = h < 12 ? "오전" : "오후";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${ampm} ${h12}:${String(m).padStart(2, "0")}`;
}

/** 끼니(게시물)의 대표 시간 = 담긴 음식 중 가장 이른 먹은 시간. */
function mealTimeOf(items: FoodLog[]): string | null {
  const ts = items.map((i) => i.eatenAt).filter((t): t is string => !!t);
  return ts.length ? ts.slice().sort()[0] : null;
}

/** 서울 기준 현재 "HH:MM"(24h). */
function nowSeoulHHMM(): string {
  return new Date().toLocaleTimeString("en-GB", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function DietBoard({
  date,
  today,
  logs: initial,
  target,
  mealPhotos,
}: {
  date: string;
  today: string;
  logs: FoodLog[];
  target: MacroTarget;
  mealPhotos: Record<Meal, string[]>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [logs, setLogs] = useState<FoodLog[]>(initial);
  const [photos, setPhotos] = useState<Record<Meal, string[]>>(mealPhotos);
  const [adding, setAdding] = useState<Meal | null>(null);
  const [detail, setDetail] = useState<Meal | null>(null);

  // 사진 1장 추가(맨 뒤) — 먼저 등록한 게 대표사진.
  function addPhoto(meal: Meal, url: string) {
    setPhotos((p) => ({ ...p, [meal]: [...p[meal], url] }));
    start(async () => {
      const res = await addMealPhotoAction(meal, url, date);
      if (!res.ok)
        setPhotos((p) => ({ ...p, [meal]: p[meal].filter((u) => u !== url) }));
      else router.refresh();
    });
  }

  // 사진 1장 삭제(URL 기준).
  function removePhoto(meal: Meal, url: string) {
    const prev = photos[meal];
    setPhotos((p) => ({ ...p, [meal]: p[meal].filter((u) => u !== url) }));
    start(async () => {
      const res = await removeMealPhotoAction(meal, url, date);
      if (!res.ok) setPhotos((p) => ({ ...p, [meal]: prev }));
      else router.refresh();
    });
  }

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
    if (pending) return;
    const d = addDaysYmd(date, delta);
    start(() => router.push(d === today ? "/diet" : `/diet?d=${d}`));
  }

  function addFood(meal: Meal, input: FoodInput) {
    if (pending) return;
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
      category: input.category ?? null,
      photoUrl: input.photoUrl ?? null,
      eatenAt: input.eatenAt ?? null,
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
    if (pending) return;
    const prev = logs;
    setLogs((cur) => cur.filter((l) => l.id !== id));
    start(async () => {
      const res = await deleteFoodLogAction(id);
      if (!res.ok) setLogs(prev);
      else router.refresh();
    });
  }

  function editFood(id: string, patch: Partial<Omit<FoodInput, "meal">>) {
    if (pending) return;
    const prev = logs;
    setLogs((cur) =>
      cur.map((l) =>
        l.id === id
          ? {
              ...l,
              ...(patch.name !== undefined ? { name: patch.name } : {}),
              ...(patch.kcal !== undefined ? { kcal: patch.kcal } : {}),
              ...(patch.protein !== undefined ? { protein: patch.protein } : {}),
              ...(patch.carbs !== undefined ? { carbs: patch.carbs } : {}),
              ...(patch.fat !== undefined ? { fat: patch.fat } : {}),
              ...(patch.amount !== undefined ? { amount: patch.amount } : {}),
              ...(patch.category !== undefined ? { category: patch.category } : {}),
              ...(patch.eatenAt !== undefined ? { eatenAt: patch.eatenAt } : {}),
            }
          : l,
      ),
    );
    start(async () => {
      const res = await updateFoodLogAction(id, patch);
      if (!res.ok) setLogs(prev);
      else router.refresh();
    });
  }

  // 게시물(끼니)의 먹은 시간 변경 — 그 끼니의 모든 음식에 동일 적용.
  function setMealTime(meal: Meal, hhmm: string) {
    const time = hhmm || null;
    const ids = logs.filter((l) => l.meal === meal).map((l) => l.id);
    const prev = logs;
    setLogs((cur) =>
      cur.map((l) => (l.meal === meal ? { ...l, eatenAt: time } : l)),
    );
    start(async () => {
      const results = await Promise.all(
        ids.map((id) => updateFoodLogAction(id, { eatenAt: time })),
      );
      if (results.some((r) => !r.ok)) setLogs(prev);
      else router.refresh();
    });
  }

  // 게시물(끼니) 통째 삭제 — 그 끼니의 모든 음식 + 사진 제거.
  function deleteMeal(meal: Meal) {
    if (pending) return;
    const prevLogs = logs;
    const prevPhotos = photos[meal];
    setLogs((cur) => cur.filter((l) => l.meal !== meal));
    setPhotos((p) => ({ ...p, [meal]: [] }));
    setDetail(null);
    start(async () => {
      const res = await deleteMealAction(meal, date);
      if (prevPhotos.length) await clearMealPhotosAction(meal, date);
      if (!res.ok) {
        setLogs(prevLogs);
        setPhotos((p) => ({ ...p, [meal]: prevPhotos }));
      } else {
        router.refresh();
      }
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
            disabled={pending}
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 disabled:opacity-30 dark:text-zinc-400 dark:hover:bg-zinc-800"
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
            disabled={isToday || pending}
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 disabled:opacity-30 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <ChevronRight aria-hidden="true" size={18} />
          </button>
        </div>
      </div>

      {/* 요약 카드 — 칼로리 링 + 탄단지 바 */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
        <div className="flex items-center gap-4">
          <KcalRing consumed={totals.kcal} target={target.kcal} />
          <div className="min-w-0 flex-1 space-y-2.5">
            <MacroBar label="단백질" consumed={totals.protein} target={target.protein} color="#10b981" />
            <MacroBar label="탄수화물" consumed={totals.carbs} target={target.carbs} color="#f59e0b" />
            <MacroBar label="지방" consumed={totals.fat} target={target.fat} color="#ef4444" />
          </div>
        </div>
      </div>

      {/* 끼니별 게시물 카드 */}
      <div className="space-y-3">
        {MEALS.map((meal) => (
          <MealSection
            key={meal}
            meal={meal}
            items={logs.filter((l) => l.meal === meal)}
            photos={photos[meal]}
            onAdd={() => setAdding(meal)}
            onOpen={() => setDetail(meal)}
          />
        ))}
      </div>

      {detail ? (
        <MealDetailDialog
          meal={detail}
          items={logs.filter((l) => l.meal === detail)}
          photos={photos[detail]}
          isToday={isToday}
          onAddPhoto={(url) => addPhoto(detail, url)}
          onRemovePhoto={(url) => removePhoto(detail, url)}
          onSetTime={(hhmm) => setMealTime(detail, hhmm)}
          onClose={() => setDetail(null)}
          onAdd={() => setAdding(detail)}
          onUpdate={editFood}
          onDelete={removeFood}
          onDeleteMeal={() => deleteMeal(detail)}
        />
      ) : null}

      {adding ? (
        <AddFoodDialog
          meal={adding}
          items={logs.filter((l) => l.meal === adding)}
          photos={photos[adding]}
          isToday={isToday}
          onAddPhoto={(url) => addPhoto(adding, url)}
          onRemovePhoto={(url) => removePhoto(adding, url)}
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
    <div className="flex shrink-0 flex-col items-center gap-1">
      <div className="relative h-20 w-20">
        <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
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
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-base font-extrabold leading-none tabular-nums text-zinc-950 dark:text-zinc-50">
            {consumed}
          </span>
          <span className="mt-0.5 text-[10px] font-semibold leading-none text-zinc-400">
            / {target}
          </span>
        </div>
      </div>
      <span
        className={`whitespace-nowrap text-[11px] font-bold ${
          over ? "text-rose-500" : "text-zinc-400"
        }`}
      >
        {over ? `+${consumed - target} 초과` : `${remain} 남음`}
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

function MacroChip({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-2 py-2 text-center dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-[10px] font-bold text-zinc-400">{label}</p>
      <p className="text-sm font-extrabold tabular-nums" style={{ color }}>
        {Math.round(value)}g
      </p>
    </div>
  );
}

/** 사진이 없을 때 보여줄 기본 이미지 — 끼니 이모지 + 은은한 그라데이션. */
function DefaultMealPhoto({
  meal,
  className = "",
}: {
  meal: Meal;
  className?: string;
}) {
  return (
    <div
      aria-label={`${MEAL_LABEL[meal]} 기본 사진`}
      className={`flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-emerald-50 to-zinc-100 dark:from-emerald-950/40 dark:to-zinc-800 ${className}`}
    >
      <span className="text-5xl opacity-70" aria-hidden="true">
        {MEAL_ICON[meal]}
      </span>
      <span className="text-[11px] font-semibold text-zinc-400">사진 없음</span>
    </div>
  );
}

/** 끼니 = 하나의 게시물 카드. 즉시삭제 없음 — 탭하면 상세로 들어가 수정·삭제. */
function MealSection({
  meal,
  items,
  photos,
  onAdd,
  onOpen,
}: {
  meal: Meal;
  items: FoodLog[];
  photos: string[];
  onAdd: () => void;
  onOpen: () => void;
}) {
  const sub = Math.round(items.reduce((s, i) => s + i.kcal, 0));
  const empty = items.length === 0 && photos.length === 0;
  const time = mealTimeOf(items);
  const cover = photos[0] ?? null;
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between px-4 pt-4">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-zinc-900 dark:text-zinc-100">
          <span aria-hidden="true">{MEAL_ICON[meal]}</span>
          {MEAL_LABEL[meal]}
          {time ? (
            <span className="text-xs font-medium text-zinc-400">· {fmtClock(time)}</span>
          ) : null}
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

      {empty ? (
        <p className="px-4 py-5 text-center text-xs text-zinc-400 dark:text-zinc-500">
          아직 기록이 없어요 · ‘추가’로 식단을 올려보세요
        </p>
      ) : (
        <button
          type="button"
          onClick={onOpen}
          aria-label={`${MEAL_LABEL[meal]} 게시물 열기`}
          className="mt-3 block w-full text-left transition hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
        >
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cover}
                alt={`${MEAL_LABEL[meal]} 대표사진`}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            ) : (
              <DefaultMealPhoto meal={meal} className="h-full w-full" />
            )}
            {photos.length > 1 ? (
              <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-bold text-white">
                <Images aria-hidden="true" size={12} />
                {photos.length}
              </span>
            ) : null}
          </div>
          <div className="px-4 py-3">
            {items.length > 0 ? (
              <ul className="space-y-1">
                {items.map((it) => (
                  <li
                    key={it.id}
                    className="flex items-baseline justify-between gap-2 text-sm"
                  >
                    <span className="min-w-0 flex-1 truncate font-semibold text-zinc-800 dark:text-zinc-100">
                      {it.name}
                      {it.amount ? (
                        <span className="ml-1.5 text-xs font-normal text-zinc-400">
                          {it.amount}
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-[11px] tabular-nums text-zinc-500 dark:text-zinc-400">
                      {Math.round(it.kcal)}kcal
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-zinc-400">사진만 기록됨</p>
            )}
          </div>
        </button>
      )}
    </div>
  );
}

/** 게시물 상세 — 끼니 전체를 보고 ‘…’ 메뉴로 수정/삭제. */
function MealDetailDialog({
  meal,
  items,
  photos,
  isToday,
  onAddPhoto,
  onRemovePhoto,
  onSetTime,
  onClose,
  onAdd,
  onUpdate,
  onDelete,
  onDeleteMeal,
}: {
  meal: Meal;
  items: FoodLog[];
  photos: string[];
  isToday: boolean;
  onAddPhoto: (url: string) => void;
  onRemovePhoto: (url: string) => void;
  onSetTime: (hhmm: string) => void;
  onClose: () => void;
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<Omit<FoodInput, "meal">>) => void;
  onDelete: (id: string) => void;
  onDeleteMeal: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [photoIdx, setPhotoIdx] = useState(0);
  const sub = Math.round(items.reduce((s, i) => s + i.kcal, 0));
  const time = mealTimeOf(items);
  const totals = items.reduce(
    (a, i) => ({
      kcal: a.kcal + i.kcal,
      protein: a.protein + (i.protein ?? 0),
      carbs: a.carbs + (i.carbs ?? 0),
      fat: a.fat + (i.fat ?? 0),
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-zinc-50 dark:bg-zinc-950">
      <div className="flex items-center justify-between border-b border-zinc-200 px-2 pb-2 pt-[max(env(safe-area-inset-top),0.75rem)] dark:border-zinc-800">
        <button
          type="button"
          aria-label="닫기"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <ChevronLeft aria-hidden="true" size={20} />
        </button>
        <span className="flex items-center gap-1.5 text-base font-bold text-zinc-900 dark:text-zinc-100">
          <span aria-hidden="true">{MEAL_ICON[meal]}</span>
          {MEAL_LABEL[meal]}
          {sub > 0 ? (
            <span className="ml-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
              {sub} kcal
            </span>
          ) : null}
        </span>
        <div className="relative">
          <button
            type="button"
            aria-label="더보기"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <MoreHorizontal aria-hidden="true" size={20} />
          </button>
          {menuOpen ? (
            <div className="absolute right-0 top-10 z-10 w-32 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setEditing(true);
                }}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                <Pencil aria-hidden="true" size={15} />
                수정
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setConfirmDel(true);
                }}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                <Trash2 aria-hidden="true" size={15} />
                삭제
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {confirmDel ? (
        <div className="flex items-center justify-between gap-3 border-b border-red-200 bg-red-50 px-4 py-2.5 dark:border-red-900/50 dark:bg-red-950/30">
          <span className="text-sm font-semibold text-red-700 dark:text-red-300">
            이 {MEAL_LABEL[meal]} 기록을 삭제할까요?
          </span>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setConfirmDel(false)}
              className="h-8 rounded-md px-3 text-sm font-semibold text-zinc-600 dark:text-zinc-300"
            >
              취소
            </button>
            <button
              type="button"
              aria-label="삭제 확인"
              onClick={onDeleteMeal}
              className="h-8 rounded-md bg-red-600 px-3 text-sm font-bold text-white transition hover:bg-red-500"
            >
              삭제
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {editing ? (
          <>
            <MultiPhotoPicker
              photos={photos}
              onAdd={onAddPhoto}
              onRemove={onRemovePhoto}
              isToday={isToday}
              label={`${MEAL_LABEL[meal]} 사진 (먼저 등록한 게 대표)`}
            />
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-zinc-500">
                먹은 시간
              </span>
              <input
                type="time"
                value={time ?? ""}
                onChange={(e) => onSetTime(e.target.value)}
                className="h-11 w-40 rounded-xl border border-zinc-300 bg-white px-3 text-base outline-none focus:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </label>
          </>
        ) : (
          <>
            {/* 사진 캐러셀 — 없으면 기본사진. 여러 장이면 < > 로 넘김. */}
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-800">
              {photos.length > 0 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photos[wrapIndex(photoIdx, photos.length)]}
                  alt={`${MEAL_LABEL[meal]} 사진`}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              ) : (
                <DefaultMealPhoto meal={meal} className="h-full w-full" />
              )}
              {photos.length > 1 ? (
                <>
                  <button
                    type="button"
                    aria-label="이전 사진"
                    onClick={() => setPhotoIdx((i) => i - 1)}
                    className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white transition hover:bg-black/65"
                  >
                    <ChevronLeft aria-hidden="true" size={20} />
                  </button>
                  <button
                    type="button"
                    aria-label="다음 사진"
                    onClick={() => setPhotoIdx((i) => i + 1)}
                    className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white transition hover:bg-black/65"
                  >
                    <ChevronRight aria-hidden="true" size={20} />
                  </button>
                  <span className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-bold text-white">
                    {wrapIndex(photoIdx, photos.length) + 1}/{photos.length}
                  </span>
                  <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
                    {photos.map((u, i) => (
                      <span
                        key={u}
                        className={`h-1.5 w-1.5 rounded-full ${
                          i === wrapIndex(photoIdx, photos.length)
                            ? "bg-white"
                            : "bg-white/50"
                        }`}
                      />
                    ))}
                  </div>
                </>
              ) : null}
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl" aria-hidden="true">
                  {MEAL_ICON[meal]}
                </span>
                <div>
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {MEAL_LABEL[meal]}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {time ? fmtClock(time) : "시간 미입력"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {Math.round(totals.kcal)}
                </p>
                <p className="text-[10px] font-semibold text-zinc-400">kcal</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <MacroChip label="단백질" value={totals.protein} color="#10b981" />
              <MacroChip label="탄수화물" value={totals.carbs} color="#f59e0b" />
              <MacroChip label="지방" value={totals.fat} color="#ef4444" />
            </div>
          </>
        )}

        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-400 dark:text-zinc-500">
            아직 담은 음식이 없어요
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((it) =>
              editing && editId === it.id ? (
                <li key={it.id}>
                  <EditFoodForm
                    item={it}
                    onCancel={() => setEditId(null)}
                    onSave={(patch) => {
                      onUpdate(it.id, patch);
                      setEditId(null);
                    }}
                    onDelete={() => {
                      onDelete(it.id);
                      setEditId(null);
                    }}
                  />
                </li>
              ) : (
                <li key={it.id}>
                  <button
                    type="button"
                    disabled={!editing}
                    aria-label={editing ? `${it.name} 수정` : undefined}
                    onClick={editing ? () => setEditId(it.id) : undefined}
                    className="flex w-full items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-left dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                        {it.name}
                        {it.category ? (
                          <span className="ml-1.5 rounded bg-zinc-100 px-1 py-0.5 text-[10px] font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                            {it.category}
                          </span>
                        ) : null}
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
                    {editing ? (
                      <Pencil
                        aria-hidden="true"
                        size={15}
                        className="shrink-0 text-zinc-400"
                      />
                    ) : null}
                  </button>
                </li>
              ),
            )}
          </ul>
        )}

        {editing ? (
          <div className="space-y-2">
            <button
              type="button"
              onClick={onAdd}
              className="flex h-12 w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
            >
              <Plus aria-hidden="true" size={16} />
              음식 추가
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setEditId(null);
              }}
              className="h-11 w-full rounded-xl bg-zinc-900 text-sm font-bold text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
            >
              완료
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** 게시물 상세의 음식 1건 인라인 수정 폼 + 삭제. */
function EditFoodForm({
  item,
  onSave,
  onDelete,
  onCancel,
}: {
  item: FoodLog;
  onSave: (patch: Partial<Omit<FoodInput, "meal">>) => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState(item.category ?? "");
  const [kcal, setKcal] = useState(String(Math.round(item.kcal)));
  const [protein, setProtein] = useState(
    item.protein != null ? String(item.protein) : "",
  );
  const [carbs, setCarbs] = useState(item.carbs != null ? String(item.carbs) : "");
  const [fat, setFat] = useState(item.fat != null ? String(item.fat) : "");
  const [amount, setAmount] = useState(item.amount ?? "");
  const numOrNull = (s: string) => (s.trim() === "" ? null : Number(s));
  const valid = name.trim() !== "" && kcal.trim() !== "" && Number(kcal) >= 0;
  const field =
    "h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-base outline-none focus:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";
  return (
    <div className="space-y-3 rounded-xl border border-emerald-300 bg-white p-3 dark:border-emerald-700 dark:bg-zinc-900">
      <label className="block">
        <span className="mb-1 block text-xs font-bold text-zinc-500">음식 이름</span>
        <input value={name} onChange={(e) => setName(e.target.value)} className={field} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-zinc-500">칼로리(kcal)</span>
          <input value={kcal} onChange={(e) => setKcal(e.target.value)} type="number" inputMode="numeric" className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-zinc-500">양(선택)</span>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="예: 1인분" className={field} />
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-xs font-bold text-zinc-500">종류(선택)</span>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={field}>
          <option value="">선택 안 함</option>
          {FOOD_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
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
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="이 음식 삭제"
          onClick={onDelete}
          className="flex h-11 items-center justify-center gap-1 rounded-xl border border-red-300 px-3 text-sm font-bold text-red-600 transition hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
        >
          <Trash2 aria-hidden="true" size={15} />
          삭제
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-11 flex-1 rounded-xl bg-zinc-100 text-sm font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
        >
          취소
        </button>
        <button
          type="button"
          disabled={!valid}
          onClick={() =>
            onSave({
              name,
              kcal: Number(kcal),
              protein: numOrNull(protein),
              carbs: numOrNull(carbs),
              fat: numOrNull(fat),
              amount: amount.trim() || null,
              category: category || null,
            })
          }
          className="h-11 flex-1 rounded-xl bg-emerald-600 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
        >
          저장
        </button>
      </div>
    </div>
  );
}

/** 끼니 사진 여러 장 첨부 — 파일 선택 → 업로드 → 추가. 첫 번째가 대표사진.
 *  오늘 기록이면 ‘촬영’(카메라) + ‘앨범’ 둘 다, 과거 기록이면 ‘앨범’만 노출. */
function MultiPhotoPicker({
  photos,
  onAdd,
  onRemove,
  isToday = true,
  label = "사진(선택)",
}: {
  photos: string[];
  onAdd: (url: string) => void;
  onRemove: (url: string) => void;
  isToday?: boolean;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr(null);
    setBusy(true);
    try {
      onAdd(await uploadFoodPhoto(file));
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "업로드 실패");
    } finally {
      setBusy(false);
    }
  }

  const tile =
    "flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-zinc-300 text-zinc-400 dark:border-zinc-600";

  return (
    <div>
      <span className="mb-1 block text-xs font-bold text-zinc-500">{label}</span>
      <div className="flex flex-wrap gap-2">
        {photos.map((url, i) => (
          <div key={url} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt="음식 사진"
              loading="lazy"
              decoding="async"
              className="h-24 w-24 rounded-xl object-cover"
            />
            {i === 0 ? (
              <span className="absolute left-1 top-1 rounded bg-emerald-600 px-1 py-0.5 text-[9px] font-bold text-white">
                대표
              </span>
            ) : null}
            <button
              type="button"
              aria-label="사진 삭제"
              onClick={() => onRemove(url)}
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800/80 text-white"
            >
              <X aria-hidden="true" size={13} />
            </button>
          </div>
        ))}
        {/* 오늘 기록이면 즉석 촬영 허용 */}
        {isToday ? (
          <label className={tile} aria-label="사진 촬영">
            {busy ? (
              <Loader2 aria-hidden="true" size={20} className="animate-spin" />
            ) : (
              <Camera aria-hidden="true" size={20} />
            )}
            <span className="text-[11px] font-semibold">
              {busy ? "올리는 중" : "촬영"}
            </span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={pick}
              disabled={busy}
              className="hidden"
            />
          </label>
        ) : null}
        {/* 앨범(갤러리)에서 선택 — 과거 기록은 이 경로만 */}
        <label className={tile} aria-label="앨범에서 선택">
          {busy ? (
            <Loader2 aria-hidden="true" size={20} className="animate-spin" />
          ) : (
            <Images aria-hidden="true" size={20} />
          )}
          <span className="text-[11px] font-semibold">
            {busy ? "올리는 중" : "앨범"}
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={pick}
            disabled={busy}
            className="hidden"
          />
        </label>
      </div>
      {err ? <p className="mt-1 text-[11px] text-red-500">{err}</p> : null}
    </div>
  );
}

/** amount 표기에서 기준 그램 수를 뽑는다. "100g"→100, "1공기(210g)"→210, "1개"→null. */
function parseGrams(amount: string): number | null {
  const m = amount.match(/(\d+(?:\.\d+)?)\s*g/);
  return m ? Number(m[1]) : null;
}

/** 선택한 음식의 양 조절 — 그램 단위(애매한 고기·생선 등)면 g 입력으로 칼로리 비례 계산,
 *  아니면 인분/개 단위 ×배수. */
function QuantityEditor({
  food,
  meal,
  onBack,
  onConfirm,
}: {
  food: FoodItem;
  meal: Meal;
  onBack: () => void;
  onConfirm: (input: FoodInput) => void;
}) {
  const baseG = parseGrams(food.amount);
  const [grams, setGrams] = useState(String(baseG ?? 100));
  const [qty, setQty] = useState(1);

  // 배율: 그램 모드면 g/기준g, 인분 모드면 qty.
  const factor = baseG
    ? (Number(grams) > 0 ? Number(grams) / baseG : 0)
    : qty;
  const r1 = (n: number) => Math.round(n * 10) / 10;
  const kcal = Math.round(food.kcal * factor);
  const amountLabel = baseG
    ? `${Number(grams) || 0}g`
    : qty === 1
      ? food.amount
      : `${food.amount} ×${qty}`;

  function confirm() {
    onConfirm({
      meal,
      name: food.name,
      kcal,
      protein: r1(food.protein * factor),
      carbs: r1(food.carbs * factor),
      fat: r1(food.fat * factor),
      amount: amountLabel,
      category: food.category,
    });
  }

  const QTYS = [0.5, 1, 1.5, 2, 3];
  return (
    <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-8 pt-4">
      <button
        type="button"
        onClick={onBack}
        className="text-sm font-semibold text-zinc-500 dark:text-zinc-400"
      >
        ← 목록으로
      </button>
      <div>
        <p className="text-lg font-bold text-zinc-950 dark:text-zinc-50">{food.name}</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          기준 {food.amount} · {food.kcal}kcal
        </p>
      </div>

      {baseG ? (
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-zinc-500">
            그램(g) 입력 — 양에 맞춰 칼로리 자동 계산
          </span>
          <div className="flex items-center gap-2">
            <input
              autoFocus
              type="number"
              inputMode="numeric"
              value={grams}
              onChange={(e) => setGrams(e.target.value)}
              className="h-12 w-32 rounded-xl border border-zinc-300 bg-white px-3 text-center text-lg font-bold outline-none focus:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <span className="text-sm font-semibold text-zinc-500">g</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[50, 100, 150, 200, 300].map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGrams(String(g))}
                className="rounded-full border border-zinc-300 px-2.5 py-1 text-xs font-semibold text-zinc-600 dark:border-zinc-600 dark:text-zinc-300"
              >
                {g}g
              </button>
            ))}
          </div>
        </label>
      ) : (
        <div>
          <span className="mb-1 block text-xs font-bold text-zinc-500">양(인분/개)</span>
          <div className="flex flex-wrap gap-1.5">
            {QTYS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setQty(n)}
                className={`h-10 min-w-[3rem] rounded-xl px-3 text-sm font-bold transition ${
                  qty === n
                    ? "bg-emerald-600 text-white"
                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                }`}
              >
                ×{n}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl bg-emerald-50 p-3 text-center dark:bg-emerald-950/30">
        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          {amountLabel} · 단 {r1(food.protein * factor)} · 탄 {r1(food.carbs * factor)} · 지 {r1(food.fat * factor)}
        </span>
        <p className="text-2xl font-extrabold tabular-nums text-emerald-700 dark:text-emerald-300">
          {kcal} kcal
        </p>
      </div>

      <button
        type="button"
        onClick={confirm}
        className="h-12 w-full rounded-xl bg-emerald-600 text-base font-bold text-white transition hover:bg-emerald-500"
      >
        담기
      </button>
    </div>
  );
}

function AddFoodDialog({
  meal,
  items,
  photos,
  isToday,
  onClose,
  onAdd,
  onAddPhoto,
  onRemovePhoto,
}: {
  meal: Meal;
  items: FoodLog[];
  photos: string[];
  isToday: boolean;
  onClose: () => void;
  onAdd: (input: FoodInput) => void;
  onAddPhoto: (url: string) => void;
  onRemovePhoto: (url: string) => void;
}) {
  const [mode, setMode] = useState<"search" | "manual">("search");
  const [q, setQ] = useState("");
  const results = useMemo(() => searchFoods(q).slice(0, 200), [q]);
  const [picked, setPicked] = useState<FoodItem | null>(null);
  const [time, setTime] = useState(isToday ? nowSeoulHHMM() : "");
  const addWithTime = (input: FoodInput) =>
    onAdd({ ...input, eatenAt: time || null });

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

      {/* 게시물 사진 — 끼니당 여러 장 (오늘이면 촬영·앨범, 과거면 앨범). 첫 장이 대표 */}
      <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
        <MultiPhotoPicker
          photos={photos}
          onAdd={onAddPhoto}
          onRemove={onRemovePhoto}
          isToday={isToday}
          label={`${MEAL_LABEL[meal]} 사진`}
        />
      </div>

      {/* 먹은 시간 — 등록 시 함께 기록 */}
      <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-2.5 dark:border-zinc-800">
        <span className="text-xs font-bold text-zinc-500">먹은 시간</span>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          aria-label="먹은 시간"
          className="h-9 rounded-lg border border-zinc-300 bg-white px-2 text-sm outline-none focus:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
      </div>

      {/* 이미 담은 음식(읽기 전용) — 삭제·수정은 게시물 상세에서 */}
      {items.length > 0 ? (
        <div className="border-b border-zinc-100 px-4 py-2 dark:border-zinc-800">
          <p className="mb-1 text-[11px] font-bold text-zinc-400">담은 음식</p>
          <ul className="flex flex-col gap-1">
            {items.map((it) => (
              <li key={it.id} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm text-zinc-700 dark:text-zinc-200">
                  {it.name}
                  <span className="ml-1 text-xs text-zinc-400">
                    {it.amount ? `${it.amount} · ` : ""}
                    {Math.round(it.kcal)}kcal
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex gap-1 px-4 pt-3">
        {(["search", "manual"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setPicked(null);
            }}
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

      {mode === "manual" ? (
        <ManualForm
          onSubmit={(input) => {
            addWithTime(input);
            onClose();
          }}
        />
      ) : picked ? (
        <QuantityEditor
          food={picked}
          meal={meal}
          onBack={() => setPicked(null)}
          onConfirm={(input) => {
            addWithTime(input);
            setPicked(null);
          }}
        />
      ) : (
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
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => setPicked(f)}
                    className="flex w-full items-center gap-2 py-2.5 text-left"
                  >
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
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                      <Plus aria-hidden="true" size={16} />
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </>
      )}
    </div>
  );

  function ManualForm({ onSubmit }: { onSubmit: (i: FoodInput) => void }) {
    const [name, setName] = useState("");
    const [category, setCategory] = useState("");
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
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-zinc-500">종류(선택)</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={field}
          >
            <option value="">선택 안 함</option>
            {FOOD_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
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
              category: category || null,
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
