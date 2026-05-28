"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Sparkles, Trash2 } from "lucide-react";

import type { FocusTone } from "@/features/routine/data";
import {
  allExercisesForFocus,
  EQUIPMENT_LABELS,
  exercisesForFocus,
  getCatalogExercise,
  prescribe,
  type EquipmentId,
} from "@/features/routine/exercise-catalog";
import {
  saveDailyPlanAction,
  type DailyPlanItem,
} from "@/features/routine/daily-plan-actions";
import type { DailyPlanRow } from "@/features/routine/daily-plan";
import type { BodyType, ExperienceLevel } from "@/features/profile/data";
import {
  isEquipmentAvailable,
  toGymEquipmentSet,
} from "@/features/gym/gym-equipment-mapping";

type Row = {
  exerciseId: string;
  equipment: EquipmentId;
  sets: number;
  reps: number;
  weight: string;
};

function toRow(item: DailyPlanRow): Row {
  return {
    exerciseId: item.exerciseId,
    equipment: item.equipment,
    sets: item.sets,
    reps: item.reps,
    weight: item.weightKg === null ? "" : String(item.weightKg),
  };
}

export function DailyMainEditor({
  focus,
  label,
  gender,
  experience,
  bodyType,
  weightKg,
  dateYmd,
  initial,
  gymEquipment = null,
}: {
  focus: FocusTone;
  label: string;
  gender: "male" | "female";
  experience: ExperienceLevel;
  bodyType: BodyType | null;
  weightKg: number | null;
  dateYmd: string;
  initial: DailyPlanRow[];
  /** 내 헬스장 기구 ID 배열. null = 미설정(필터링 안 함) */
  gymEquipment?: readonly string[] | null;
}) {
  const router = useRouter();
  const gymSet = toGymEquipmentSet(gymEquipment);
  // 드롭다운에는 부위에 매핑된 카탈로그 전체 (gender 무관 — 본인이 직접 선택)
  const options = allExercisesForFocus(focus);
  // 추천 자동 채우기에는 성별 큐레이션 짧은 목록
  const recommendedOptions = exercisesForFocus(focus, gender);
  const [rows, setRows] = useState<Row[]>(initial.map(toRow));
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function update(next: Row[]) {
    setRows(next);
    setMsg(null);
  }

  /** 운동의 기구 옵션 중 헬스장에 있는 첫 번째를 기본값으로. 없으면 첫 번째 */
  function pickDefaultEquipment(ex: { equipments: { equipment: EquipmentId }[] }): EquipmentId {
    const available = ex.equipments.find((eq) =>
      isEquipmentAvailable(eq.equipment, gymSet),
    );
    return available?.equipment ?? ex.equipments[0].equipment;
  }

  function addRow() {
    const first = options[0];
    if (!first) return;
    update([
      ...rows,
      {
        exerciseId: first.id,
        equipment: pickDefaultEquipment(first),
        sets: 3,
        reps: 10,
        weight: "",
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
    }));
  }

  function save() {
    start(async () => {
      const items = rowsToItems(rows);
      const res = await saveDailyPlanAction(dateYmd, focus, items);
      setMsg(res.ok ? `‘${label}’ 저장됨` : res.error);
      if (res.ok) router.refresh();
    });
  }

  /** 체형·성별·경력 기반 추천으로 행을 채움 — 저장은 아래"오늘 본운동 저장" 버튼이 담당 */
  function recommend() {
    const opts = {
      gender,
      experience,
      bodyType: bodyType ?? ("average" as const),
      weightKg: weightKg ?? 65,
    };
    // 추천으로 채울 때는 부위별 큐레이션된 짧은 목록 사용 (드롭다운 전체 ≠ 추천)
    const next: Row[] = recommendedOptions.map((ex) => {
      const p = prescribe(ex.id, opts);
      return {
        exerciseId: ex.id,
        equipment: pickDefaultEquipment(ex),
        sets: p.sets,
        reps: p.reps,
        weight: p.weightKg === null ? "" : String(p.weightKg),
      };
    });
    update(next);
  }

  return (
    <section className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-100">
          {label} · 본운동
        </h3>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            disabled={pending}
            onClick={recommend}
            className="inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-md border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 transition hover:bg-emerald-100 dark:hover:bg-emerald-900/30 disabled:opacity-60"
          >
            <Sparkles aria-hidden="true" size={14} />
            추천으로 채우기
          </button>
          <button
            type="button"
            onClick={addRow}
            className="inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
          >
            <Plus aria-hidden="true" size={14} />
            운동 추가
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
          등록된 운동이 없습니다. “운동 추가”로 직접 넣으세요.
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
                    update(next);
                  }}
                  className="h-9 min-w-[8rem] flex-1 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200"
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
                    update(next);
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
                    next[idx] = { ...row, sets: Number(e.target.value) };
                    update(next);
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
                    next[idx] = { ...row, reps: Number(e.target.value) };
                    update(next);
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
                    update(next);
                  }}
                  className="h-9 w-16 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 text-center text-sm"
                />
                <button
                  type="button"
                  aria-label="삭제"
                  onClick={() => update(rows.filter((_, i) => i !== idx))}
                  className="flex h-9 w-9 items-center justify-center rounded-md text-zinc-400 dark:text-zinc-500 transition hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600"
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
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-zinc-900 dark:bg-zinc-100 px-4 text-sm font-semibold text-white dark:text-zinc-900 transition hover:bg-zinc-700 dark:hover:bg-white disabled:opacity-60"
        >
          {pending ? (
            <Loader2 aria-hidden="true" className="animate-spin" size={15} />
          ) : null}
          저장
        </button>
        {msg ? (
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            {msg}
          </span>
        ) : null}
      </div>
    </section>
  );
}
