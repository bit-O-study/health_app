"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Camera, Check, Loader2, Sparkles } from "lucide-react";

import { resizeImageForAI } from "@/lib/image/resize-for-ai";
import { isNativeApp } from "@/lib/platform/is-native-app";
import { scanMealPhotoAction } from "@/features/diet/meal-scan-actions";
import type { ScannedFood } from "@/features/diet/meal-scan-parse";
import type { FoodInput } from "@/features/diet/diet-actions";
import type { Meal } from "@/features/diet/meal";

/**
 * AI 식단 사진 인식 — 사진 1장 → NVIDIA 비전이 음식·칼로리 추정 → 사용자가 골라 담기.
 * 담기는 기존 addFoodLogAction(onAdd) 경로를 그대로 쓴다(먹은 시간도 함께 반영됨).
 */
export function MealScanForm({
  meal,
  onAdd,
  onClose,
}: {
  meal: Meal;
  onAdd: (input: FoodInput) => void;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [items, setItems] = useState<ScannedFood[] | null>(null);
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  // 앱(APK)에선 사진앱/카메라를 열고, 웹에선 파일 업로드만.
  const [isApp, setIsApp] = useState(false);
  useEffect(() => setIsApp(isNativeApp()), []);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setItems(null);
    let img: { base64: string; mediaType: string; preview: string };
    try {
      img = await resizeImageForAI(file);
    } catch (err) {
      setError((err as Error).message);
      return;
    }
    setPreview(img.preview);
    start(async () => {
      const res = await scanMealPhotoAction({
        imageBase64: img.base64,
        mediaType: img.mediaType,
      });
      if (res.ok) {
        setItems(res.items);
        setChecked(Object.fromEntries(res.items.map((_, i) => [i, true])));
      } else {
        setError(res.error);
      }
    });
  }

  function addSelected() {
    if (!items) return;
    items.forEach((it, i) => {
      if (!checked[i]) return;
      onAdd({
        meal,
        name: it.name,
        kcal: it.kcal,
        protein: it.protein,
        carbs: it.carbs,
        fat: it.fat,
        amount: it.amount,
        category: null,
      });
    });
    onClose();
  }

  const anyChecked = items ? items.some((_, i) => checked[i]) : false;

  return (
    <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-8 pt-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        {...(isApp ? { capture: "environment" as const } : {})}
        onChange={onPick}
        className="hidden"
      />

      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt="식단 사진"
          className="max-h-56 w-full rounded-xl object-contain ring-1 ring-zinc-200 dark:ring-zinc-700"
        />
      ) : null}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={pending}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60"
      >
        {pending ? (
          <Loader2 aria-hidden="true" size={17} className="animate-spin" />
        ) : (
          <Sparkles aria-hidden="true" size={17} />
        )}
        {pending
          ? "AI가 음식 분석 중…"
          : items
            ? "다른 사진으로 다시"
            : "음식 사진 찍기 / 올리기"}
      </button>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </p>
      ) : null}

      {items ? (
        <div className="space-y-2">
          <p className="text-xs font-bold text-zinc-500">
            인식된 음식 · 담을 것만 선택하세요 (값은 담은 뒤 수정 가능)
          </p>
          <ul className="space-y-1.5">
            {items.map((it, i) => (
              <li key={`${it.name}-${i}`}>
                <button
                  type="button"
                  onClick={() =>
                    setChecked((c) => ({ ...c, [i]: !c[i] }))
                  }
                  aria-pressed={!!checked[i]}
                  className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition ${
                    checked[i]
                      ? "border-emerald-400 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/30"
                      : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                      checked[i]
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-zinc-300 dark:border-zinc-600"
                    }`}
                  >
                    {checked[i] ? <Check aria-hidden="true" size={13} /> : null}
                  </span>
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
                      {it.protein != null ? ` · 단 ${it.protein}` : ""}
                      {it.carbs != null ? ` · 탄 ${it.carbs}` : ""}
                      {it.fat != null ? ` · 지 ${it.fat}` : ""}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            disabled={!anyChecked}
            onClick={addSelected}
            className="h-12 w-full rounded-xl bg-emerald-600 text-base font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
          >
            선택한 음식 담기
          </button>
          <p className="text-center text-[11px] text-zinc-400">
            AI 추정값이라 정확하지 않을 수 있어요. 담은 뒤 수정할 수 있습니다.
          </p>
        </div>
      ) : (
        <p className="flex items-center justify-center gap-1.5 rounded-xl bg-zinc-50 px-3 py-6 text-center text-xs text-zinc-400 dark:bg-zinc-900 dark:text-zinc-500">
          <Camera aria-hidden="true" size={14} />
          음식 사진을 올리면 AI가 칼로리를 추정해 드려요
        </p>
      )}
    </div>
  );
}
