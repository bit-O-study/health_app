"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GripVertical, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";

import { ConfirmDialog } from "@/components/confirm-dialog";

import {
  DAY_BLOCKS,
  isDayBlockId,
  type DayBlockId,
  type FocusTone,
} from "@/features/routine/data";
import {
  allExercisesForFocus,
  EQUIPMENT_LABELS,
  exercisesForFocus,
  getCatalogExercise,
  prescribe,
  type CatalogExercise,
  type EquipmentId,
} from "@/features/routine/exercise-catalog";
import { focusExercisesForSlot } from "@/features/routine/recommend";
import { ExerciseSearchSelect } from "@/features/routine/components/exercise-search-select";
import { subMusclesForExercise } from "@/features/routine/muscle-detail";
import { muscleGroup } from "@/features/routine/muscle-map";
import {
  saveDailyPlanAction,
  type DailyPlanItem,
} from "@/features/routine/daily-plan-actions";
import type { DailyPlanRow } from "@/features/routine/daily-plan";
import type { SetDetail } from "@/features/routine/set-details";
import { SetDetailsEditor } from "@/features/routine/components/set-details-editor";
import type { BodyType, ExperienceLevel } from "@/features/profile/data";
import {
  isEquipmentAvailable,
  toGymEquipmentSet,
} from "@/features/gym/gym-equipment-mapping";

type Row = {
  focus: FocusTone;
  exerciseId: string;
  equipment: EquipmentId;
  sets: number;
  reps: number;
  weight: string;
  setDetails: SetDetail[] | null;
};

export type MainSection = {
  focus: FocusTone;
  label: string;
  initial: DailyPlanRow[];
  /** 세부근육 블록(가슴 상부 등). 있으면 '추천으로 채우기'가 그 세부근육 운동으로 채운다. */
  blockIds?: DayBlockId[];
};

/** 직접 담기에서 고를 수 있는 기본 부위(세부근육 블록 제외 — 그건 부위 안 세부칩으로). */
const BASE_PARTS: FocusTone[] = [
  "chest",
  "back",
  "shoulder",
  "arm",
  "lower",
  "core",
];

function toRow(focus: FocusTone, r: DailyPlanRow): Row {
  return {
    focus,
    exerciseId: r.exerciseId,
    equipment: r.equipment,
    sets: r.sets,
    reps: r.reps,
    weight: r.weightKg === null ? "" : String(r.weightKg),
    setDetails: r.setDetails,
  };
}

/**
 * 오늘만 본운동 — 오늘 선택한 여러 부위를 **한 편집기**에서 다룬다.
 * 운동은 한 목록(부위는 태그로 구분), '추천으로 채우기'/'운동 추가' 버튼은 각각 1개.
 * 저장은 내부에서 부위별로 나눠 daily_plan 에 저장(부위별 오버라이드).
 */
export function DailyMainEditor({
  sections,
  gender,
  experience,
  bodyType,
  weightKg,
  dateYmd,
  gymEquipment = null,
  lockWeightReps = false,
  allowAllExercises = false,
  recommendFocuses,
  hideRecommend = false,
  addableFocuses,
}: {
  sections: MainSection[];
  gender: "male" | "female";
  experience: ExperienceLevel;
  bodyType: BodyType | null;
  weightKg: number | null;
  dateYmd: string;
  gymEquipment?: readonly string[] | null;
  lockWeightReps?: boolean;
  /** sections 가 비었을 때(직접 담기) '추천으로 채우기'가 쓸 부위들. */
  recommendFocuses?: FocusTone[];
  /** 직접 담기 등 순수 수동 모드 — '추천으로 채우기' 버튼을 숨긴다. */
  hideRecommend?: boolean;
  /** 직접 담기 — sections 에 부위가 있어도 전체 카탈로그에서 고르게 한다. */
  allowAllExercises?: boolean;
  /** '오늘만 부위 추가' 모드 — 새로 담을 수 있는 부위를 '추가 요청한 부위'로만 제한.
   * (기존 today 부위는 그대로 보이되, 새 운동 추가/부위 전환은 이 부위들로 한정.) */
  addableFocuses?: FocusTone[];
}) {
  const router = useRouter();
  const gymSet = toGymEquipmentSet(gymEquipment);
  const focuses = sections.map((s) => s.focus);
  // 부위별 세부근육 블록 — '추천으로 채우기'가 세부근육(가슴 상부 등)을 따르게 한다.
  const blockIdsByFocus = new Map<FocusTone, DayBlockId[]>(
    sections.map((s) => [s.focus, s.blockIds ?? []]),
  );
  // 부위 한글 라벨 — sections 에 있으면 그 라벨, 없으면(직접 담기) DAY_BLOCKS 한글명.
  const labelOf = (f: FocusTone) =>
    sections.find((s) => s.focus === f)?.label ??
    (isDayBlockId(f) ? DAY_BLOCKS[f].label : f);

  // '기존 운동 추가' 방식: 부위를 먼저 고르고 → 그 부위 운동만 목록에 나온다.
  // 직접 담기(allowAllExercises)면 전체 기본 부위에서 고를 수 있게, 아니면 이 편집기의
  // 부위(전체 바꾸기=선택 부위 / 부위 추가=현재+추가)만 고를 수 있다.
  const focusChoices: FocusTone[] = allowAllExercises
    ? BASE_PARTS
    : focuses.length > 0
      ? focuses
      : BASE_PARTS;
  // '오늘만 부위 추가'면 새로 담을 부위를 '추가 요청한 부위'로 제한한다(없으면 기존 로직).
  const addChoices: FocusTone[] =
    addableFocuses && addableFocuses.length > 0 ? addableFocuses : focusChoices;
  // 한 행에서 고를 수 있는 부위 — 그 행의 현재 부위 + 새로 담을 수 있는 부위(중복 제거).
  // (부위 추가 모드에서 기존 부위 행은 자기 부위를 유지하되, 다른 요청 부위로만 바꿀 수 있다.)
  const rowFocusChoices = (rowFocus: FocusTone): FocusTone[] =>
    addableFocuses && addableFocuses.length > 0
      ? [...new Set<FocusTone>([rowFocus, ...addChoices])]
      : focusChoices;
  // 행의 부위에 맞는 운동 목록(그 부위만). 세부근육 칩은 ExerciseSearchSelect 안에서 좁힘.
  const optionsFor = (f: FocusTone): CatalogExercise[] => allExercisesForFocus(f);

  const [rows, setRows] = useState<Row[]>(() =>
    sections.flatMap((s) => s.initial.map((r) => toRow(s.focus, r))),
  );
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [confirmRecommend, setConfirmRecommend] = useState(false);

  useEffect(() => {
    if (!dirty) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  function update(next: Row[]) {
    setRows(next);
    setDirty(true);
    setMsg(null);
  }

  function pickDefaultEquipment(ex: {
    equipments: { equipment: EquipmentId }[];
  }): EquipmentId {
    const available = ex.equipments.find((eq) =>
      isEquipmentAvailable(eq.equipment, gymSet),
    );
    return available?.equipment ?? ex.equipments[0].equipment;
  }

  function addRow() {
    const f0 = addChoices[0];
    const first = optionsFor(f0)[0];
    if (!first) return;
    update([
      ...rows,
      {
        focus: f0,
        exerciseId: first.id,
        equipment: pickDefaultEquipment(first),
        sets: 3,
        reps: 10,
        weight: "",
        setDetails: null,
      },
    ]);
  }

  /** 행의 부위 변경 — 그 부위 첫 운동으로 초기화(기존 '운동 추가'와 동일 동작). */
  function changeRowFocus(idx: number, nextFocus: FocusTone) {
    const first = optionsFor(nextFocus)[0];
    const next = [...rows];
    next[idx] = {
      ...next[idx],
      focus: nextFocus,
      exerciseId: first?.id ?? next[idx].exerciseId,
      equipment: first ? pickDefaultEquipment(first) : next[idx].equipment,
    };
    update(next);
  }

  function rowsToItems(list: Row[]): DailyPlanItem[] {
    return list.map((r) => ({
      exerciseId: r.exerciseId,
      equipment: r.equipment,
      sets: r.sets,
      reps: r.reps,
      weightKg: r.weight.trim() === "" ? null : Number(r.weight),
      setDetails: r.setDetails,
    }));
  }

  function save() {
    start(async () => {
      // 오늘 부위 + 행에 실제로 들어있는 부위 전부 저장(비면 그 부위 오버라이드 제거).
      const allFocuses = [...new Set([...focuses, ...rows.map((r) => r.focus)])];
      for (const f of allFocuses) {
        const items = rowsToItems(rows.filter((r) => r.focus === f));
        const res = await saveDailyPlanAction(dateYmd, f, items);
        if (!res.ok) {
          setMsg(res.error);
          return;
        }
      }
      setMsg("저장됨");
      setDirty(false);
      router.refresh();
    });
  }

  function recommend() {
    if (rows.length > 0) setConfirmRecommend(true);
    else doRecommend();
  }

  /** 오늘 각 부위의 추천 운동을 모아 한 목록으로 채운다. */
  function doRecommend() {
    const opts = {
      gender,
      experience,
      bodyType: bodyType ?? ("average" as const),
      weightKg: weightKg ?? 65,
    };
    const next: Row[] = [];
    // 부위 추가 모드면 '추가 요청한 부위'만 추천한다(기존 오늘 부위는 유지). 직접 담기(sections
    // 없음)면 recommendFocuses(오늘 원래 부위)로. 그 외(전체 바꾸기)면 편집기의 부위 전체.
    const addOnly = !!(addableFocuses && addableFocuses.length > 0);
    const recFocuses = addOnly
      ? addableFocuses!
      : focuses.length > 0
        ? focuses
        : (recommendFocuses ?? []);
    for (const f of recFocuses) {
      // 세부근육 블록을 고른 부위면 그 세부근육 운동으로 추천(없으면 부위 전체 추천).
      const blockIds = blockIdsByFocus.get(f) ?? [];
      const recExercises =
        blockIds.length > 0 && f !== "rest"
          ? focusExercisesForSlot(f, blockIds, gender)
          : exercisesForFocus(f, gender);
      for (const ex of recExercises) {
        const p = prescribe(ex.id, opts);
        next.push({
          focus: f,
          exerciseId: ex.id,
          equipment: pickDefaultEquipment(ex),
          sets: p.sets,
          reps: p.reps,
          weight: p.weightKg === null ? "" : String(p.weightKg),
          setDetails: null,
        });
      }
    }
    if (addOnly) {
      // 기존(핀된 오늘 부위) 행은 유지하고, 추천 요청 부위만 덧붙인다(중복 방지 — 전체 대체 X).
      const seen = new Set(rows.map((r) => `${r.focus}:${r.exerciseId}`));
      const appended = next.filter(
        (r) => !seen.has(`${r.focus}:${r.exerciseId}`),
      );
      update([...rows, ...appended]);
    } else {
      update(next);
    }
    setConfirmRecommend(false);
  }

  // ── 드래그 순서 변경 — 그립을 잡으면 바로 이동(롱프레스 없음).
  // (롱프레스 방식은 손가락을 조금만 움직여도 취소돼 '드래그가 안 되는' 문제가 있었다.)
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dragRef = useRef<{ from: number; startY: number } | null>(null);
  const [drag, setDrag] = useState<{ from: number; dy: number } | null>(null);

  function onGripDown(e: React.PointerEvent, index: number) {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = { from: index, startY: e.clientY };
    setDrag({ from: index, dy: 0 });
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(8);
  }
  function onGripMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    e.preventDefault();
    const y = e.clientY;
    let target = d.from;
    for (let i = 0; i < rowRefs.current.length; i++) {
      const el = rowRefs.current[i];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const mid = (r.top + r.bottom) / 2;
      if (i < d.from && y < mid) {
        target = i;
        break;
      }
      if (i > d.from && y > mid) target = i;
    }
    if (target !== d.from) {
      const next = [...rows];
      const [moved] = next.splice(d.from, 1);
      next.splice(target, 0, moved);
      dragRef.current = { from: target, startY: y };
      setDrag({ from: target, dy: 0 });
      update(next);
    } else {
      setDrag({ from: d.from, dy: y - d.startY });
    }
  }
  function onGripUp() {
    dragRef.current = null;
    setDrag(null);
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-100">본운동</h2>
        <div className="flex flex-wrap items-center gap-1.5">
          {!hideRecommend ? (
            <button
              type="button"
              disabled={pending}
              onClick={recommend}
              className="inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-md border border-emerald-300 bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
            >
              <Sparkles aria-hidden="true" size={14} />
              추천으로 채우기
            </button>
          ) : null}
          <button
            type="button"
            onClick={addRow}
            className="inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-md border border-zinc-300 bg-white px-2.5 text-xs font-semibold text-zinc-700 transition hover:border-emerald-300 hover:bg-emerald-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30"
          >
            <Plus aria-hidden="true" size={14} />
            운동 추가
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
          등록된 운동이 없습니다. “추천으로 채우기” 또는 “운동 추가”로 넣으세요.
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          {rows.map((row, idx) => {
            // 카탈로그에서 사라진 운동 id(옛 데이터·AI 커스텀 등)면 getCatalogExercise 가
            // undefined 이고, 그 부위에 옵션이 없으면 options[0] 도 undefined → 예전엔
            // ex.equipments 에서 크래시. equipments 를 안전하게 비워 크래시를 막는다.
            const rowOptions = optionsFor(row.focus);
            const ex = getCatalogExercise(row.exerciseId) ?? rowOptions[0];
            const exEquipments = ex?.equipments ?? [];
            const sub = subMusclesForExercise(row.exerciseId)[0];
            return (
              <div
                key={idx}
                ref={(el) => {
                  rowRefs.current[idx] = el;
                }}
                style={
                  drag?.from === idx
                    ? {
                        transform: `translateY(${drag.dy}px) scale(1.03)`,
                        boxShadow: "0 14px 30px rgba(0,0,0,0.18)",
                        zIndex: 20,
                        position: "relative",
                        transition: "none",
                        touchAction: "none",
                      }
                    : { transition: "transform 160ms ease" }
                }
                className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-2.5 dark:border-zinc-700 dark:bg-zinc-900"
              >
                {/* 1행: 그립 + 부위 + 삭제 */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="드래그로 순서 변경"
                    onPointerDown={(e) => onGripDown(e, idx)}
                    onPointerMove={onGripMove}
                    onPointerUp={onGripUp}
                    onPointerCancel={onGripUp}
                    className="flex h-9 w-6 shrink-0 cursor-grab touch-none items-center justify-center text-zinc-400 active:cursor-grabbing dark:text-zinc-500"
                  >
                    <GripVertical aria-hidden="true" size={16} />
                  </button>

                  {/* 부위 먼저 — 여러 부위면 드롭다운, 아니면 라벨.
                      (기존 '운동 추가'와 동일: 부위 → 그 부위 운동만 목록에.) */}
                  {(() => {
                    const choices = rowFocusChoices(row.focus);
                    return choices.length > 1 ? (
                    <select
                      aria-label="부위"
                      value={isDayBlockId(row.focus) ? row.focus : choices[0]}
                      onChange={(e) =>
                        changeRowFocus(idx, e.target.value as FocusTone)
                      }
                      className="h-9 min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-2 text-sm font-semibold text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
                    >
                      {choices.map((f) => (
                        <option key={f} value={f}>
                          {isDayBlockId(f) ? DAY_BLOCKS[f].label : f}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span
                      className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                      style={{
                        backgroundColor: sub
                          ? muscleGroup(sub.muscle).color
                          : "#71717a",
                      }}
                    >
                      {labelOf(row.focus)}
                      {sub ? `(${sub.label})` : ""}
                    </span>
                    );
                  })()}

                  <button
                    type="button"
                    aria-label="삭제"
                    onClick={() => update(rows.filter((_, i) => i !== idx))}
                    className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-zinc-400 transition hover:bg-red-50 hover:text-red-600 dark:text-zinc-500 dark:hover:bg-red-950/40"
                  >
                    <Trash2 aria-hidden="true" size={16} />
                  </button>
                </div>

                {/* 2행: 운동 + 기구 */}
                <div className="flex items-center gap-2 pl-8">
                  <ExerciseSearchSelect
                    options={rowOptions}
                    muscleFilter
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
                      update(next);
                    }}
                  />

                  <select
                    aria-label="기구"
                    value={row.equipment}
                    onChange={(e) => {
                      const next = [...rows];
                      next[idx] = {
                        ...row,
                        equipment: e.target.value as EquipmentId,
                      };
                      update(next);
                    }}
                    className="h-9 max-w-[40%] shrink-0 rounded-md border border-zinc-300 bg-white px-2 text-sm text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
                  >
                    {exEquipments.map((eq) => {
                      const ok = isEquipmentAvailable(eq.equipment, gymSet);
                      return (
                        <option key={eq.equipment} value={eq.equipment}>
                          {EQUIPMENT_LABELS[eq.equipment]}
                          {ok ? "" : " (헬스장에 없음)"}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* 3행: 세트/무게/횟수 */}
                <div className="pl-8">
                  <SetDetailsEditor
                    onlySets={!lockWeightReps}
                    sets={row.sets}
                    reps={row.reps}
                    weight={row.weight}
                    setDetails={row.setDetails}
                    onUniformChange={(patch) => {
                      const next = [...rows];
                      next[idx] = { ...row, ...patch };
                      update(next);
                    }}
                    onSetDetailsChange={(sd) => {
                      const next = [...rows];
                      next[idx] = { ...row, setDetails: sd };
                      update(next);
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={save}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-zinc-900 px-4 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          {pending ? <Loader2 aria-hidden="true" className="animate-spin" size={15} /> : null}
          저장
        </button>
        {msg ? (
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{msg}</span>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmRecommend}
        tone="danger"
        title="추천 운동으로 교체할까요?"
        message="지금 편집 중인 운동들이 오늘 부위 추천 운동으로 교체됩니다. (저장 전이면 ‘저장’을 눌러야 반영됩니다.)"
        confirmLabel="교체하기"
        onConfirm={doRecommend}
        onCancel={() => setConfirmRecommend(false)}
      />
    </section>
  );
}
