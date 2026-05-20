"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";

import type { FocusTone } from "@/features/routine/data";
import {
  EQUIPMENT_LABELS,
  exercisesForFocus,
  getCatalogExercise,
  type EquipmentId,
} from "@/features/routine/exercise-catalog";
import {
  saveDailyPlanAction,
  type DailyPlanItem,
} from "@/features/routine/daily-plan-actions";
import type { DailyPlanRow } from "@/features/routine/daily-plan";

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
  dateYmd,
  initial,
}: {
  focus: FocusTone;
  label: string;
  gender: "male" | "female";
  dateYmd: string;
  initial: DailyPlanRow[];
}) {
  const router = useRouter();
  const options = exercisesForFocus(focus, gender);
  const [rows, setRows] = useState<Row[]>(initial.map(toRow));
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function update(next: Row[]) {
    setRows(next);
    setMsg(null);
  }

  function addRow() {
    const first = options[0];
    if (!first) return;
    update([
      ...rows,
      {
        exerciseId: first.id,
        equipment: first.equipments[0].equipment,
        sets: 3,
        reps: 10,
        weight: "",
      },
    ]);
  }

  function save() {
    start(async () => {
      const items: DailyPlanItem[] = rows.map((r) => ({
        exerciseId: r.exerciseId,
        equipment: r.equipment,
        sets: r.sets,
        reps: r.reps,
        weightKg: r.weight.trim() === "" ? null : Number(r.weight),
      }));
      const res = await saveDailyPlanAction(dateYmd, focus, items);
      setMsg(res.ok ? `‘${label}’ 저장됨` : res.error);
      if (res.ok) router.refresh();
    });
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-zinc-950">{label} · 본운동</h3>
        <button
          type="button"
          onClick={addRow}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-zinc-300 bg-white px-2.5 text-xs font-semibold text-zinc-700 transition hover:border-emerald-300 hover:bg-emerald-50"
        >
          <Plus aria-hidden="true" size={14} />
          운동 추가
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">
          등록된 운동이 없습니다. “운동 추가”로 직접 넣으세요.
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          {rows.map((row, idx) => {
            const ex = getCatalogExercise(row.exerciseId) ?? options[0];
            return (
              <div
                key={idx}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-2.5"
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
                      equipment:
                        nextEx?.equipments[0].equipment ?? row.equipment,
                    };
                    update(next);
                  }}
                  className="h-9 min-w-[8rem] flex-1 rounded-md border border-zinc-300 bg-white px-2 text-sm font-semibold text-zinc-800"
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
                  className="h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm text-zinc-800"
                >
                  {ex.equipments.map((eq) => (
                    <option key={eq.equipment} value={eq.equipment}>
                      {EQUIPMENT_LABELS[eq.equipment]}
                    </option>
                  ))}
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
                  className="h-9 w-14 rounded-md border border-zinc-300 bg-white px-2 text-center text-sm"
                />
                <span className="text-xs text-zinc-500">세트</span>
                <input
                  aria-label="횟수"
                  type="number"
                  value={row.reps}
                  onChange={(e) => {
                    const next = [...rows];
                    next[idx] = { ...row, reps: Number(e.target.value) };
                    update(next);
                  }}
                  className="h-9 w-14 rounded-md border border-zinc-300 bg-white px-2 text-center text-sm"
                />
                <span className="text-xs text-zinc-500">회</span>
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
                  className="h-9 w-16 rounded-md border border-zinc-300 bg-white px-2 text-center text-sm"
                />
                <button
                  type="button"
                  aria-label="삭제"
                  onClick={() =>
                    update(rows.filter((_, i) => i !== idx))
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-md text-zinc-400 transition hover:bg-red-50 hover:text-red-600"
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
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-zinc-900 px-4 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:opacity-60"
        >
          {pending ? (
            <Loader2 aria-hidden="true" className="animate-spin" size={15} />
          ) : null}
          오늘 본운동 저장
        </button>
        {msg ? (
          <span className="text-xs font-medium text-zinc-600">{msg}</span>
        ) : null}
      </div>
    </section>
  );
}
