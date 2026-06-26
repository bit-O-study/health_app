"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Sparkles, Trash2 } from "lucide-react";

import { ConfirmDialog } from "@/components/confirm-dialog";

import type { FocusTone } from "@/features/routine/data";
import type { PlanExercise } from "@/features/routine/plan";
import {
  allExercisesForFocus,
  EQUIPMENT_LABELS,
  getCatalogExercise,
  majorMuscleTag,
  prescribe,
  type EquipmentId,
} from "@/features/routine/exercise-catalog";
import {
  focusExercisesForSlot,
  sideExercisesForSlot,
} from "@/features/routine/recommend";
import { ExerciseSearchSelect } from "@/features/routine/components/exercise-search-select";
import { subMusclesForExercise } from "@/features/routine/muscle-detail";
import { muscleGroup } from "@/features/routine/muscle-map";
import {
  registerRecommendedPlanAction,
  saveManualPlanAction,
} from "@/features/routine/plan-actions";
import { clearAllPlanAction } from "@/features/routine/delete-actions";
import type { SetDetail } from "@/features/routine/set-details";
import type { ConditioningRow } from "@/features/routine/conditioning";
import { ConditioningEditor } from "@/features/routine/components/conditioning-editor";
import { SetDetailsEditor } from "@/features/routine/components/set-details-editor";
import type { BodyType, ExperienceLevel } from "@/features/profile/data";
import {
  isEquipmentAvailable,
  toGymEquipmentSet,
} from "@/features/gym/gym-equipment-mapping";

type FocusData = {
  /** 일차+부위 고유 키 (예: "3:push") — 반복 부위가 충돌하지 않게 state 키로 사용 */
  key: string;
  dayIndex: number;
  focus: FocusTone;
  /** 사이드 추천 운동 선택용 블록 id (이두/삼두 구분) */
  blockIds: string[];
  /** 그날 보조(사이드) 부위인지 — 추천 채우기 시 2개만 */
  isSide: boolean;
  label: string;
  items: PlanExercise[];
  warmup: ConditioningRow[];
  cooldown: ConditioningRow[];
  /** 워밍업/마무리 에디터 노출 여부 (부위 첫 섹션만 true — 중복 방지) */
  showConditioning: boolean;
};

type Row = {
  exerciseId: string;
  equipment: EquipmentId;
  sets: number;
  reps: number;
  weight: string;
  setDetails: SetDetail[] | null;
};

function toRow(item: PlanExercise): Row {
  return {
    exerciseId: item.exerciseId,
    equipment: item.equipment,
    sets: item.sets,
    reps: item.reps,
    weight: item.weightKg === null ? "" : String(item.weightKg),
    setDetails: item.setDetails,
  };
}

export function PlanEditor({
  focuses,
  gender,
  experience,
  bodyType,
  weightKg,
  gymEquipment = null,
  lockWeightReps = false,
}: {
  focuses: FocusData[];
  gender: "male" | "female";
  experience: ExperienceLevel;
  bodyType: BodyType | null;
  weightKg: number | null;
  /** 내 헬스장 기구 ID 배열. null = 미설정(필터링 안 함) */
  gymEquipment?: readonly string[] | null;
  /** 무게·횟수 고정 설정. false 면 입력란 숨기고 세트 수만(운동모드에서 설정). */
  lockWeightReps?: boolean;
}) {
  const router = useRouter();
  const gymSet = toGymEquipmentSet(gymEquipment);
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<string | null>(null);
  const [plans, setPlans] = useState<Record<string, Row[]>>(() =>
    Object.fromEntries(focuses.map((f) => [f.key, f.items.map(toRow)])),
  );
  // 저장 안 된 섹션들(key) — 페이지를 떠날 때 경고하고, "추천으로 채우기" 덮어쓰기 확인용
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  // 파괴적 동작(추천 덮어쓰기) 확인 모달 상태
  const [confirm, setConfirm] = useState<
    | { kind: "focus"; section: FocusData }
    | { kind: "all" }
    | { kind: "clear-all" }
    | null
  >(null);

  // 저장하지 않은 편집이 있는 채로 탭을 닫거나 새로고침하면 브라우저 기본 경고.
  useEffect(() => {
    if (dirty.size === 0) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  function update(key: string, next: Row[]) {
    setPlans((prev) => ({ ...prev, [key]: next }));
    setDirty((prev) => new Set(prev).add(key));
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

  function addRow(f: FocusData) {
    const options = allExercisesForFocus(f.focus);
    const first = options[0];
    if (!first) return;
    update(f.key, [
      ...(plans[f.key] ?? []),
      {
        exerciseId: first.id,
        equipment: pickDefaultEquipment(first),
        sets: 3,
        reps: 10,
        weight: "",
        setDetails: null,
      },
    ]);
  }

  // 모든 부위를 추천으로 덮어쓰고 홈으로 이동 — 직접 등록한 운동이 전부 사라지므로 확인 후 실행
  function doRecommendAll() {
    start(async () => {
      const res = await registerRecommendedPlanAction();
      if (res.ok) {
        setDirty(new Set());
        router.push("/routine");
        router.refresh();
      } else {
        setStatus(res.error);
      }
    });
  }

  // 전체 운동 비우기 — 본운동·워밍업·마무리를 즉시 DB 에서 삭제(저장 불필요).
  // 컨디셔닝 에디터는 prop 변경에 재동기화되지 않으므로 하드 새로고침으로 반영.
  function doClearAll() {
    setStatus(null);
    start(async () => {
      const res = await clearAllPlanAction();
      if (res.ok) {
        window.location.reload();
      } else {
        setStatus(res.error ?? "전체 비우기에 실패했습니다.");
      }
    });
  }

  /** 한 섹션(일차·부위)만 추천 운동으로 행을 갈아끼움 — 저장은 아래 저장 버튼 담당.
   * 보조(사이드) 섹션이면 2개만, 주 섹션이면 풀 목록. */
  function doRecommendFocus(f: FocusData) {
    const opts = {
      gender,
      experience,
      bodyType: bodyType ?? ("average" as const),
      weightKg: weightKg ?? 65,
    };
    const catalog = f.isSide
      ? sideExercisesForSlot(f.focus as never, f.blockIds, gender)
      : focusExercisesForSlot(f.focus as never, f.blockIds, gender);
    const next: Row[] = catalog.map((ex) => {
      const p = prescribe(ex.id, opts);
      return {
        exerciseId: ex.id,
        equipment: pickDefaultEquipment(ex),
        sets: p.sets,
        reps: p.reps,
        weight: p.weightKg === null ? "" : String(p.weightKg),
        setDetails: null,
      };
    });
    update(f.key, next);
  }

  // 편집 중인 행이 있으면 덮어쓰기 전에 확인, 비어 있으면 바로 채움
  function recommendFocus(f: FocusData) {
    if ((plans[f.key] ?? []).length > 0) setConfirm({ kind: "focus", section: f });
    else doRecommendFocus(f);
  }

  function saveFocus(f: FocusData) {
    start(async () => {
      const items = (plans[f.key] ?? []).map((r) => ({
        exerciseId: r.exerciseId,
        equipment: r.equipment,
        sets: r.sets,
        reps: r.reps,
        weightKg: r.weight.trim() === "" ? null : Number(r.weight),
        setDetails: r.setDetails,
      }));
      const res = await saveManualPlanAction(f.dayIndex, f.focus, items);
      setStatus(res.ok ? `“${f.label}” 저장됨` : res.error);
      if (res.ok) {
        setDirty((prev) => {
          const next = new Set(prev);
          next.delete(f.key);
          return next;
        });
        router.refresh();
      }
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
          onClick={() => setConfirm({ kind: "all" })}
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
        <p className="rounded-md bg-zinc-100 dark:bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {status}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          또는 직접 등록
        </p>
        <button
          type="button"
          data-testid="clear-all-exercises"
          disabled={pending}
          onClick={() => setConfirm({ kind: "clear-all" })}
          className="inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-md border border-red-300 dark:border-red-800 bg-white dark:bg-zinc-800 px-2.5 text-xs font-semibold text-red-600 dark:text-red-400 transition hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-60"
        >
          <Trash2 aria-hidden="true" size={14} />
          전체 운동 초기화
        </button>
      </div>

      {focuses.map((f) => {
        const rows = plans[f.key] ?? [];
        const options = allExercisesForFocus(f.focus);
        return (
          <section
            key={f.key}
            className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-1.5 text-base font-bold text-zinc-950 dark:text-zinc-100">
                {f.label}
                {f.isSide ? (
                  <span className="rounded-full bg-zinc-100 dark:bg-zinc-700 px-2 py-0.5 text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
                    보조
                  </span>
                ) : null}
              </h3>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => recommendFocus(f)}
                  className="inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-md border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 transition hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                >
                  <Sparkles aria-hidden="true" size={14} />
                  추천으로 채우기
                </button>
                <button
                  type="button"
                  onClick={() => addRow(f)}
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
                      <span className="flex shrink-0 flex-wrap gap-1">
                        {/* 대근육 부위 1개 + 세부근육 1개만 */}
                        {(() => {
                          const major = majorMuscleTag(row.exerciseId);
                          return (
                            <span
                              className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold ${major.tone}`}
                            >
                              {major.label}
                            </span>
                          );
                        })()}
                        {(() => {
                          const sub = subMusclesForExercise(row.exerciseId)[0];
                          if (!sub) return null;
                          return (
                            <span
                              className="whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                              style={{
                                backgroundColor: muscleGroup(sub.muscle).color,
                              }}
                            >
                              {sub.label}
                            </span>
                          );
                        })()}
                      </span>
                      <div className="flex-1 basis-full sm:basis-auto">
                        <ExerciseSearchSelect
                          options={options}
                          value={row.exerciseId}
                          onChange={(id) => {
                            const nextEx = getCatalogExercise(id);
                            const next = [...rows];
                            next[idx] = {
                              ...row,
                              exerciseId: id,
                              equipment: nextEx
                                ? pickDefaultEquipment(nextEx)
                                : row.equipment,
                            };
                            update(f.key, next);
                          }}
                        />
                      </div>

                      <select
                        aria-label="기구"
                        value={row.equipment}
                        onChange={(e) => {
                          const next = [...rows];
                          next[idx] = {
                            ...row,
                            equipment: e.target.value as EquipmentId,
                          };
                          update(f.key, next);
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

                      <SetDetailsEditor
                        sets={row.sets}
                        reps={row.reps}
                        weight={row.weight}
                        setDetails={row.setDetails}
                        onlySets={!lockWeightReps}
                        onUniformChange={(patch) => {
                          const next = [...rows];
                          next[idx] = { ...row, ...patch };
                          update(f.key, next);
                        }}
                        onSetDetailsChange={(sd) => {
                          const next = [...rows];
                          next[idx] = { ...row, setDetails: sd };
                          update(f.key, next);
                        }}
                      />
                      <button
                        type="button"
                        aria-label="삭제"
                        data-testid={`delete-row-${f.key}-${idx}`}
                        onClick={() =>
                          update(
                            f.key,
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
              onClick={() => saveFocus(f)}
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

            {f.showConditioning ? (
              <div className="mt-5 space-y-3 border-t border-zinc-200 dark:border-zinc-700 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  워밍업 / 마무리
                </p>
                <ConditioningEditor
                  focus={f.focus}
                  kind="warmup"
                  initial={f.warmup}
                  lockWeightReps={lockWeightReps}
                />
                <ConditioningEditor
                  focus={f.focus}
                  kind="cooldown"
                  initial={f.cooldown}
                  lockWeightReps={lockWeightReps}
                />
              </div>
            ) : null}
          </section>
        );
      })}

      <ConfirmDialog
        open={confirm !== null}
        tone="danger"
        title={
          confirm?.kind === "clear-all"
            ? "전체 운동을 비울까요?"
            : "추천 운동으로 교체할까요?"
        }
        message={
          confirm?.kind === "clear-all"
            ? "본운동·워밍업·마무리 운동이 모두 즉시 삭제됩니다(저장 안 눌러도 바로 반영). ⚠️ 되돌릴 수 없습니다. (이미 완료한 운동 기록·점수는 그대로 유지됩니다.)"
            : confirm?.kind === "all"
              ? "직접 등록·수정한 모든 부위의 운동이 추천 운동으로 교체되고 바로 저장됩니다. 되돌릴 수 없습니다."
              : "이 부위에서 편집 중인 운동들이 추천 운동으로 교체됩니다. (저장 전이면 ‘저장’을 눌러야 반영됩니다.)"
        }
        confirmLabel={confirm?.kind === "clear-all" ? "전체 비우기" : "교체하기"}
        onConfirm={() => {
          if (confirm?.kind === "all") doRecommendAll();
          else if (confirm?.kind === "focus") doRecommendFocus(confirm.section);
          else if (confirm?.kind === "clear-all") doClearAll();
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
