"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Sparkles, Trash2 } from "lucide-react";

import type { FocusTone } from "@/features/routine/data";
import type { PlanExercise } from "@/features/routine/plan";
import {
  allExercisesForFocus,
  EQUIPMENT_LABELS,
  exercisesForFocus,
  getCatalogExercise,
  prescribe,
  type EquipmentId,
} from "@/features/routine/exercise-catalog";
import {
  registerRecommendedPlanAction,
  saveManualPlanAction,
} from "@/features/routine/plan-actions";
import type { ConditioningRow } from "@/features/routine/conditioning";
import { ConditioningEditor } from "@/features/routine/components/conditioning-editor";
import type { BodyType, ExperienceLevel } from "@/features/profile/data";
import {
  isEquipmentAvailable,
  toGymEquipmentSet,
} from "@/features/gym/gym-equipment-mapping";

type FocusData = {
  focus: FocusTone;
  label: string;
  items: PlanExercise[];
  warmup: ConditioningRow[];
  cooldown: ConditioningRow[];
};

type Row = {
  exerciseId: string;
  equipment: EquipmentId;
  sets: number;
  reps: number;
  weight: string;
};

function toRow(item: PlanExercise): Row {
  return {
    exerciseId: item.exerciseId,
    equipment: item.equipment,
    sets: item.sets,
    reps: item.reps,
    weight: item.weightKg === null ? "" : String(item.weightKg),
  };
}

export function PlanEditor({
  focuses,
  gender,
  experience,
  bodyType,
  weightKg,
  gymEquipment = null,
}: {
  focuses: FocusData[];
  gender: "male" | "female";
  experience: ExperienceLevel;
  bodyType: BodyType | null;
  weightKg: number | null;
  /** 내 헬스장 기구 ID 배열. null = 미설정(필터링 안 함) */
  gymEquipment?: readonly string[] | null;
}) {
  const router = useRouter();
  const gymSet = toGymEquipmentSet(gymEquipment);
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<string | null>(null);
  const [plans, setPlans] = useState<Record<string, Row[]>>(() =>
    Object.fromEntries(focuses.map((f) => [f.focus, f.items.map(toRow)])),
  );

  function update(focus: string, next: Row[]) {
    setPlans((prev) => ({ ...prev, [focus]: next }));
    setStatus(null);
  }

  /** 운동의 기구 옵션 중 헬스장에 있는 첫 번째 */
  function pickDefaultEquipment(ex: {
    equipments: { equipment: EquipmentId }[];
  }): EquipmentId {
    const available = ex.equipments.find((eq) =>
      isEquipmentAvailable(eq.equipment, gymSet),
    );
    return available?.equipment ?? ex.equipments[0].equipment;
  }

  function addRow(focus: FocusTone) {
    const options = allExercisesForFocus(focus);
    const first = options[0];
    if (!first) return;
    update(focus, [
      ...(plans[focus] ?? []),
      {
        exerciseId: first.id,
        equipment: pickDefaultEquipment(first),
        sets: 3,
        reps: 10,
        weight: "",
      },
    ]);
  }

  function recommendAll() {
    start(async () => {
      const res = await registerRecommendedPlanAction();
      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        setStatus(res.error);
      }
    });
  }

  /** 한 부위만 추천 운동으로 행을 갈아끼움 — 저장은 아래"이 부위 저장" 버튼이 담당 */
  function recommendFocus(focus: FocusTone) {
    const opts = {
      gender,
      experience,
      bodyType: bodyType ?? ("average" as const),
      weightKg: weightKg ?? 65,
    };
    const next: Row[] = exercisesForFocus(focus, gender).map((ex) => {
      const p = prescribe(ex.id, opts);
      return {
        exerciseId: ex.id,
        equipment: pickDefaultEquipment(ex),
        sets: p.sets,
        reps: p.reps,
        weight: p.weightKg === null ? "" : String(p.weightKg),
      };
    });
    update(focus, next);
  }

  function saveFocus(focus: string) {
    start(async () => {
      const items = (plans[focus] ?? []).map((r) => ({
        exerciseId: r.exerciseId,
        equipment: r.equipment,
        sets: r.sets,
        reps: r.reps,
        weightKg: r.weight.trim() === "" ? null : Number(r.weight),
      }));
      const res = await saveManualPlanAction(focus, items);
      setStatus(res.ok ? `“${focus}” 저장됨` : res.error);
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-100">
            추천 운동들로 등록
          </h2>
          <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
            체형·성별·경력에 맞춰 모든 부위를 자동으로 채웁니다.
          </p>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={recommendAll}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
        >
          {pending ? (
            <Loader2 aria-hidden="true" className="animate-spin" size={16} />
          ) : (
            <Sparkles aria-hidden="true" size={16} />
          )}
          추천으로 등록
        </button>
      </div>

      {status ? (
        <p className="rounded-md bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {status}
        </p>
      ) : null}

      <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
        또는 직접 등록
      </p>

      {focuses.map((f) => {
        const rows = plans[f.focus] ?? [];
        const options = allExercisesForFocus(f.focus);
        return (
          <section
            key={f.focus}
            className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-100">
                {f.label}
              </h3>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => recommendFocus(f.focus)}
                  className="inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-md border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 transition hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                >
                  <Sparkles aria-hidden="true" size={14} />
                  추천으로 채우기
                </button>
                <button
                  type="button"
                  onClick={() => addRow(f.focus)}
                  className="inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                >
                  <Plus aria-hidden="true" size={14} />
                  운동 추가
                </button>
              </div>
            </div>

            {rows.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                등록된 운동이 없습니다. “운동 추가”로 직접 넣거나 위에서 추천
                등록을 사용하세요.
              </p>
            ) : (
              <div className="mt-4 space-y-2">
                {rows.map((row, idx) => {
                  const ex = getCatalogExercise(row.exerciseId) ?? options[0];
                  return (
                    <div
                      key={idx}
                      className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 p-2.5"
                    >
                      <select
                        aria-label="운동"
                        value={row.exerciseId}
                        onChange={(e) => {
                          const nextEx = getCatalogExercise(e.target.value);
                          const next = [...rows];
                          next[idx] = {
                            ...row,
                            exerciseId: e.target.value,
                            equipment: nextEx
                              ? pickDefaultEquipment(nextEx)
                              : row.equipment,
                          };
                          update(f.focus, next);
                        }}
                        className="h-9 min-w-[8rem] flex-1 basis-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200 sm:basis-auto"
                      >
                        {options.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name}
                          </option>
                        ))}
                      </select>

                      <select
                        aria-label="기구"
                        value={row.equipment}
                        onChange={(e) => {
                          const next = [...rows];
                          next[idx] = {
                            ...row,
                            equipment: e.target.value as EquipmentId,
                          };
                          update(f.focus, next);
                        }}
                        className="h-9 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 text-sm text-zinc-800 dark:text-zinc-200"
                      >
                        {ex.equipments.map((eq) => {
                          const ok = isEquipmentAvailable(eq.equipment, gymSet);
                          return (
                            <option key={eq.equipment} value={eq.equipment}>
                              {EQUIPMENT_LABELS[eq.equipment]}
                              {ok ? "" : " (헬스장에 없음)"}
                            </option>
                          );
                        })}
                      </select>

                      <input
                        aria-label="세트"
                        type="number"
                        value={row.sets}
                        onChange={(e) => {
                          const next = [...rows];
                          next[idx] = {
                            ...row,
                            sets: Number(e.target.value),
                          };
                          update(f.focus, next);
                        }}
                        className="h-9 w-14 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 text-center text-sm"
                      />
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        세트
                      </span>
                      <input
                        aria-label="횟수"
                        type="number"
                        value={row.reps}
                        onChange={(e) => {
                          const next = [...rows];
                          next[idx] = {
                            ...row,
                            reps: Number(e.target.value),
                          };
                          update(f.focus, next);
                        }}
                        className="h-9 w-14 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 text-center text-sm"
                      />
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        회
                      </span>
                      <input
                        aria-label="무게(kg)"
                        type="number"
                        value={row.weight}
                        placeholder="kg"
                        onChange={(e) => {
                          const next = [...rows];
                          next[idx] = { ...row, weight: e.target.value };
                          update(f.focus, next);
                        }}
                        className="h-9 w-16 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 text-center text-sm"
                      />
                      <button
                        type="button"
                        aria-label="삭제"
                        onClick={() =>
                          update(
                            f.focus,
                            rows.filter((_, i) => i !== idx),
                          )
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-md text-zinc-400 dark:text-zinc-500 transition hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600"
                      >
                        <Trash2 aria-hidden="true" size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              type="button"
              disabled={pending}
              onClick={() => saveFocus(f.focus)}
              className="mt-4 inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-zinc-900 dark:bg-zinc-100 px-4 text-sm font-semibold text-white dark:text-zinc-900 transition hover:bg-zinc-700 dark:hover:bg-white disabled:opacity-60"
            >
              {pending ? (
                <Loader2
                  aria-hidden="true"
                  className="animate-spin"
                  size={15}
                />
              ) : null}
              저장
            </button>

            <div className="mt-5 space-y-3 border-t border-zinc-200 dark:border-zinc-700 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                워밍업 / 마무리
              </p>
              <ConditioningEditor
                focus={f.focus}
                kind="warmup"
                initial={f.warmup}
              />
              <ConditioningEditor
                focus={f.focus}
                kind="cooldown"
                initial={f.cooldown}
              />
            </div>
          </section>
        );
      })}
    </div>
  );
}
