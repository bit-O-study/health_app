"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GripVertical, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";

import { ConfirmDialog } from "@/components/confirm-dialog";

import type { FocusTone } from "@/features/routine/data";
import {
  allExercisesForFocus,
  allExercisesGrouped,
  EQUIPMENT_LABELS,
  exercisesForFocus,
  focusForExercise,
  getCatalogExercise,
  prescribe,
  type CatalogExercise,
  type EquipmentId,
} from "@/features/routine/exercise-catalog";
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
};

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
}: {
  sections: MainSection[];
  gender: "male" | "female";
  experience: ExperienceLevel;
  bodyType: BodyType | null;
  weightKg: number | null;
  dateYmd: string;
  gymEquipment?: readonly string[] | null;
  lockWeightReps?: boolean;
}) {
  const router = useRouter();
  const gymSet = toGymEquipmentSet(gymEquipment);
  const focuses = sections.map((s) => s.focus);
  const labelOf = (f: FocusTone) =>
    sections.find((s) => s.focus === f)?.label ?? f;

  // 드롭다운 후보: 부위를 선택한 경우(전체 바꾸기)엔 그 부위 운동만, 부위 없이 직접
  // 담기면 전체 카탈로그. (담은 운동의 태그는 저장 시 focusForExercise 로 자동 배정.)
  const options: CatalogExercise[] = (() => {
    const seen = new Set<string>();
    const out: CatalogExercise[] = [];
    const source =
      focuses.length > 0
        ? focuses.flatMap((f) => allExercisesForFocus(f as FocusTone))
        : allExercisesGrouped().flatMap((g) => g.exercises);
    for (const ex of source) {
      if (seen.has(ex.id)) continue;
      seen.add(ex.id);
      out.push(ex);
    }
    return out;
  })();

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

  /** 운동의 대표 부위 — 역인덱스로 자동 배정(없으면 오늘 첫 부위, 그것도 없으면 chest). */
  function focusOf(exerciseId: string): FocusTone {
    const f = focusForExercise(exerciseId);
    if (f) return f;
    return focuses[0] ?? ("chest" as FocusTone);
  }

  function addRow() {
    const first = options[0];
    if (!first) return;
    update([
      ...rows,
      {
        focus: focusOf(first.id),
        exerciseId: first.id,
        equipment: pickDefaultEquipment(first),
        sets: 3,
        reps: 10,
        weight: "",
        setDetails: null,
      },
    ]);
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
    for (const f of focuses) {
      for (const ex of exercisesForFocus(f, gender)) {
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
    update(next);
    setConfirmRecommend(false);
  }

  // ── 드래그 순서 변경 — 메인 화면처럼 그립 '롱프레스' 로 리프트 후 이동 ──
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dragRef = useRef<{ from: number; startY: number } | null>(null);
  const lpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [drag, setDrag] = useState<{ from: number; dy: number } | null>(null);
  const LONG_PRESS = 180;

  function clearLp() {
    if (lpTimer.current) {
      clearTimeout(lpTimer.current);
      lpTimer.current = null;
    }
  }
  function onGripDown(e: React.PointerEvent, index: number) {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const startY = e.clientY;
    clearLp();
    // 롱프레스가 지나야 드래그(리프트) 시작 — 짧은 탭은 무시.
    lpTimer.current = setTimeout(() => {
      dragRef.current = { from: index, startY };
      setDrag({ from: index, dy: 0 });
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(8);
    }, LONG_PRESS);
  }
  function onGripMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) {
      clearLp();
      return;
    }
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
    clearLp();
    dragRef.current = null;
    setDrag(null);
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-100">본운동</h2>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            disabled={pending}
            onClick={recommend}
            className="inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-md border border-emerald-300 bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
          >
            <Sparkles aria-hidden="true" size={14} />
            추천으로 채우기
          </button>
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
            const ex = getCatalogExercise(row.exerciseId) ?? options[0];
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
                className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-2.5 dark:border-zinc-700 dark:bg-zinc-900"
              >
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

                <span
                  className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                  style={{
                    backgroundColor: sub ? muscleGroup(sub.muscle).color : "#71717a",
                  }}
                >
                  {labelOf(row.focus)}
                  {sub ? `(${sub.label})` : ""}
                </span>

                <ExerciseSearchSelect
                  options={options}
                  value={row.exerciseId}
                  onChange={(id) => {
                    const nextEx = getCatalogExercise(id);
                    const next = [...rows];
                    next[idx] = {
                      ...row,
                      exerciseId: id,
                      focus: focusOf(id),
                      equipment: nextEx ? pickDefaultEquipment(nextEx) : row.equipment,
                    };
                    update(next);
                  }}
                />

                <select
                  aria-label="기구"
                  value={row.equipment}
                  onChange={(e) => {
                    const next = [...rows];
                    next[idx] = { ...row, equipment: e.target.value as EquipmentId };
                    update(next);
                  }}
                  className="h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
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

                <button
                  type="button"
                  aria-label="삭제"
                  onClick={() => update(rows.filter((_, i) => i !== idx))}
                  className="flex h-9 w-9 items-center justify-center rounded-md text-zinc-400 transition hover:bg-red-50 hover:text-red-600 dark:text-zinc-500 dark:hover:bg-red-950/40"
                >
                  <Trash2 aria-hidden="true" size={16} />
                </button>
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
