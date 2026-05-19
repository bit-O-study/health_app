"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Dumbbell, Moon } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  SPLIT_PRESETS,
  TONE_STYLES,
  WEEKDAYS,
  type RoutineVariant,
} from "@/features/routine/data";

export function RoutinePlanner() {
  // 기본값: 3분할 첫 번째 변형으로 미리 채워 보여줌
  const [splits, setSplits] = useState(3);
  const [variantId, setVariantId] = useState("cbl-3");

  const preset =
    SPLIT_PRESETS.find((item) => item.splits === splits) ?? SPLIT_PRESETS[0];

  const variant: RoutineVariant =
    preset.variants.find((item) => item.id === variantId) ??
    preset.variants[0];

  const summary = useMemo(() => {
    const trainingDays = variant.week.filter(
      (day) => day.tone !== "rest",
    ).length;
    return {
      trainingDays,
      restDays: variant.week.length - trainingDays,
    };
  }, [variant]);

  function handleSelectSplit(nextSplits: number) {
    const nextPreset = SPLIT_PRESETS.find(
      (item) => item.splits === nextSplits,
    );
    if (!nextPreset) return;
    setSplits(nextSplits);
    setVariantId(nextPreset.variants[0].id);
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
          같은 분할이라도 나누는 방식이 여러 가지라 변형을 골라볼 수 있어요.
        </p>
      </div>

      {/* 분할 수 선택 */}
      <div className="mt-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          분할 선택
        </p>
        <div className="flex flex-wrap gap-2">
          {SPLIT_PRESETS.map((item) => {
            const active = item.splits === splits;
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
        </div>
        <p className="mt-2 text-sm text-zinc-500">{preset.tagline}</p>
      </div>

      {/* 변형 선택 */}
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
                onClick={() => setVariantId(item.id)}
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

      {/* 주간 그리드 */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {WEEKDAYS.map((weekday, index) => {
          const day = variant.week[index];
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
          {preset.label} · {variant.name}
        </span>
      </div>
    </section>
  );
}