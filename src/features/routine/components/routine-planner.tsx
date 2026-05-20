"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, Dumbbell, Loader2, Moon, Pencil } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  CUSTOM_SPLITS,
  CUSTOM_VARIANT_ID,
  DAY_BLOCKS,
  DAY_BLOCK_IDS,
  DEFAULT_CUSTOM_WEEK,
  DEFAULT_SPLITS,
  DEFAULT_VARIANT_ID,
  SPLIT_PRESETS,
  TONE_STYLES,
  WEEKDAYS,
  type DayBlockId,
  type RoutineVariant,
} from "@/features/routine/data";
import type { SaveRoutineResult } from "@/features/routine/actions";

type RoutinePlannerProps = {
  initialSplits?: number;
  initialVariantId?: string;
  /** variantId 가 "custom" 일 때의 초기 주간(블록 id ×7) */
  initialCustomWeek?: DayBlockId[] | null;
  /** 제공되면 "이 루틴으로 저장" 버튼을 노출 */
  saveAction?: (
    splits: number,
    variantId: string,
    customWeek?: DayBlockId[] | null,
  ) => Promise<SaveRoutineResult>;
  /** 저장 성공 시 이동할 경로 (예: 설정에서 저장 후 "/") */
  redirectOnSuccess?: string;
};

export function RoutinePlanner({
  initialSplits = DEFAULT_SPLITS,
  initialVariantId = DEFAULT_VARIANT_ID,
  initialCustomWeek = null,
  saveAction,
  redirectOnSuccess,
}: RoutinePlannerProps = {}) {
  const router = useRouter();
  const [splits, setSplits] = useState(initialSplits);
  const [variantId, setVariantId] = useState(initialVariantId);
  const [customWeek, setCustomWeek] = useState<DayBlockId[]>(
    initialCustomWeek && initialCustomWeek.length === 7
      ? initialCustomWeek
      : DEFAULT_CUSTOM_WEEK,
  );
  const [isSaving, startSaving] = useTransition();
  const [saveStatus, setSaveStatus] = useState<
    { ok: boolean; message: string } | null
  >(null);

  const isCustom = variantId === CUSTOM_VARIANT_ID;

  const preset =
    SPLIT_PRESETS.find((item) => item.splits === splits) ?? SPLIT_PRESETS[0];

  const variant: RoutineVariant =
    preset.variants.find((item) => item.id === variantId) ??
    preset.variants[0];

  /** 미리보기 주간: 커스텀이면 블록에서, 아니면 변형에서 */
  const previewWeek = isCustom
    ? customWeek.map((id) => DAY_BLOCKS[id].day)
    : variant.week;

  const trainingDays = previewWeek.filter(
    (day) => day.tone !== "rest",
  ).length;
  const summary = {
    trainingDays,
    restDays: previewWeek.length - trainingDays,
  };

  function handleSelectSplit(nextSplits: number) {
    const nextPreset = SPLIT_PRESETS.find(
      (item) => item.splits === nextSplits,
    );
    if (!nextPreset) return;
    setSplits(nextSplits);
    setVariantId(nextPreset.variants[0].id);
    setSaveStatus(null);
  }

  function handleSelectCustom() {
    setVariantId(CUSTOM_VARIANT_ID);
    setSaveStatus(null);
  }

  function handleSelectVariant(nextVariantId: string) {
    setVariantId(nextVariantId);
    setSaveStatus(null);
  }

  function handleChangeDay(index: number, blockId: DayBlockId) {
    setCustomWeek((prev) => {
      const next = [...prev];
      next[index] = blockId;
      return next;
    });
    setSaveStatus(null);
  }

  function handleSave() {
    if (!saveAction) return;
    startSaving(async () => {
      const result = isCustom
        ? await saveAction(CUSTOM_SPLITS, CUSTOM_VARIANT_ID, customWeek)
        : await saveAction(splits, variant.id, null);
      if (result.ok && redirectOnSuccess) {
        router.push(redirectOnSuccess);
        router.refresh();
        return;
      }
      setSaveStatus(
        result.ok
          ? { ok: true, message: "루틴을 저장했습니다. 메인에서 오늘 운동을 확인하세요." }
          : { ok: false, message: result.error },
      );
    });
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-7">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-emerald-700">
          <CalendarDays aria-hidden="true" size={20} />
          <p className="text-sm font-semibold uppercase tracking-wide">
            My routine
          </p>
        </div>
        <h2 className="text-2xl font-bold text-zinc-950 sm:text-3xl">
          나의 루틴
        </h2>
        <p className="text-sm leading-6 text-zinc-600">
          몇 분할로 운동할지 고르면 월~일 일주일 계획이 자동으로 채워집니다.
          원하는 구성이 없으면 <strong>커스텀</strong>으로 요일마다 부위를 직접
          정할 수 있어요.
        </p>
      </div>

      {/* 분할 수 선택 */}
      <div className="mt-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          분할 선택
        </p>
        <div className="flex flex-wrap gap-2">
          {SPLIT_PRESETS.map((item) => {
            const active = !isCustom && item.splits === splits;
            return (
              <button
                key={item.splits}
                type="button"
                onClick={() => handleSelectSplit(item.splits)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-semibold transition",
                  active
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-zinc-300 bg-white text-zinc-700 hover:border-emerald-300 hover:bg-emerald-50",
                )}
              >
                {item.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={handleSelectCustom}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition",
              isCustom
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-dashed border-zinc-400 bg-white text-zinc-700 hover:border-emerald-300 hover:bg-emerald-50",
            )}
          >
            <Pencil aria-hidden="true" size={14} />
            커스텀
          </button>
        </div>
        <p className="mt-2 text-sm text-zinc-500">
          {isCustom
            ? "월~일 7일을 직접 부위별로 채우는 나만의 분할"
            : preset.tagline}
        </p>
      </div>

      {isCustom ? (
        /* 커스텀 빌더 — 요일별 부위 지정 */
        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            요일별 부위 지정
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {WEEKDAYS.map((weekday, index) => {
              const blockId = customWeek[index];
              const style = TONE_STYLES[DAY_BLOCKS[blockId].day.tone];
              return (
                <label
                  key={weekday}
                  className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2"
                >
                  <span className="w-6 text-sm font-bold text-zinc-900">
                    {weekday}
                  </span>
                  <span
                    className={cn("h-2 w-2 shrink-0 rounded-full", style.dot)}
                  />
                  <select
                    aria-label={`${weekday}요일 부위`}
                    value={blockId}
                    onChange={(e) =>
                      handleChangeDay(index, e.target.value as DayBlockId)
                    }
                    className="h-9 w-full rounded-md border border-zinc-300 bg-white px-2 text-sm font-semibold text-zinc-800 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  >
                    {DAY_BLOCK_IDS.map((id) => (
                      <option key={id} value={id}>
                        {DAY_BLOCKS[id].label}
                      </option>
                    ))}
                  </select>
                </label>
              );
            })}
          </div>
        </div>
      ) : (
        /* 변형 선택 */
        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            나누는 방식
          </p>
          <div className="flex flex-wrap gap-2">
            {preset.variants.map((item) => {
              const active = item.id === variant.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectVariant(item.id)}
                  className={cn(
                    "rounded-md border px-3 py-2 text-left text-sm font-semibold transition",
                    active
                      ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                      : "border-zinc-300 bg-white text-zinc-700 hover:border-emerald-300 hover:bg-emerald-50",
                  )}
                >
                  {item.name}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-sm text-zinc-500">{variant.description}</p>
        </div>
      )}

      {/* 주간 그리드 (프리셋·커스텀 공통 미리보기) */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {WEEKDAYS.map((weekday, index) => {
          const day = previewWeek[index];
          const style = TONE_STYLES[day.tone];
          const isRest = day.tone === "rest";

          return (
            <div
              key={weekday}
              className={cn(
                "flex flex-col rounded-lg border p-3",
                style.card,
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-zinc-900">
                  {weekday}
                </span>
                {isRest ? (
                  <Moon
                    aria-hidden="true"
                    className="text-zinc-400"
                    size={16}
                  />
                ) : (
                  <Dumbbell
                    aria-hidden="true"
                    className="text-zinc-500"
                    size={16}
                  />
                )}
              </div>

              <span
                className={cn(
                  "mt-2 inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                  style.badge,
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
                {day.focus}
              </span>

              {isRest ? (
                <p className="mt-3 text-xs leading-5 text-zinc-500">
                  근육 회복일 — 가벼운 스트레칭이나 걷기 권장
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                      자극 부위
                    </p>
                    <p className="mt-0.5 text-xs leading-5 text-zinc-700">
                      {day.muscles.join(", ")}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                      대표 운동
                    </p>
                    <ul className="mt-0.5 space-y-0.5">
                      {day.examples.map((example) => (
                        <li
                          key={example}
                          className="text-xs leading-5 text-zinc-700"
                        >
                          · {example}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-zinc-600">
        <span>
          주 <strong className="text-zinc-900">{summary.trainingDays}</strong>회
          운동
        </span>
        <span>
          휴식 <strong className="text-zinc-900">{summary.restDays}</strong>일
        </span>
        <span className="text-zinc-400">
          {isCustom
            ? "커스텀 · 커스텀 분할"
            : `${preset.label} · ${variant.name}`}
        </span>
      </div>

      {saveAction ? (
        <div className="mt-6 flex flex-col gap-3 border-t border-zinc-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            {saveStatus ? (
              <p
                className={cn(
                  "font-medium",
                  saveStatus.ok ? "text-emerald-700" : "text-red-600",
                )}
              >
                {saveStatus.message}
              </p>
            ) : (
              <p className="text-zinc-500">
                이 루틴을 저장하면 메인 페이지에 오늘 날짜에 맞는 운동이
                표시됩니다.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {isSaving ? (
              <Loader2 aria-hidden="true" className="animate-spin" size={17} />
            ) : (
              <Check aria-hidden="true" size={17} />
            )}
            이 루틴으로 저장
          </button>
        </div>
      ) : null}
    </section>
  );
}