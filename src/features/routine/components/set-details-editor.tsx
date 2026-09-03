"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

import type { SetDetail } from "@/features/routine/set-details";

type Draft = { weight: string; reps: string };

function draftsToDetails(rows: Draft[]): SetDetail[] {
  return rows.map((r) => ({
    weightKg: r.weight.trim() === "" ? null : Number(r.weight),
    reps: Number(r.reps),
  }));
}

/**
 * 한 운동의 세트·횟수·무게 입력 위젯. "세트별 다르게" 토글로 균일 ↔ 세트별
 * (드롭세트·피라미드) 모드를 전환한다. 세트별 모드의 입력 초안(빈칸=맨몸 허용)은
 * 내부 string state 로 보관하고, 변경 시마다 부모에 SetDetail[] 로 올린다.
 *
 * plan-editor / daily-main-editor 의 운동 행에서 공통으로 사용.
 */
export function SetDetailsEditor({
  sets,
  reps,
  weight,
  setDetails,
  disabled = false,
  onlySets = false,
  onUniformChange,
  onSetDetailsChange,
}: {
  sets: number;
  reps: number;
  /** 균일 모드 무게 입력값(문자열, 빈칸=맨몸) */
  weight: string;
  setDetails: SetDetail[] | null;
  disabled?: boolean;
  /** 무게·횟수 '고정' 끔 — 세트 수만 입력받고 무게/횟수/세트별은 숨긴다(운동모드에서 설정). */
  onlySets?: boolean;
  onUniformChange: (patch: {
    sets?: number;
    reps?: number;
    weight?: string;
  }) => void;
  onSetDetailsChange: (sd: SetDetail[] | null) => void;
}) {
  const [perSet, setPerSet] = useState(
    !onlySets && !!setDetails && setDetails.length > 0,
  );
  const [rows, setRows] = useState<Draft[]>(() =>
    setDetails && setDetails.length > 0
      ? setDetails.map((s) => ({
          weight: s.weightKg === null ? "" : String(s.weightKg),
          reps: String(s.reps),
        }))
      : [{ weight, reps: String(reps) }],
  );

  function emit(next: Draft[]) {
    setRows(next);
    onSetDetailsChange(draftsToDetails(next));
  }
  function enable() {
    const n = Math.min(20, Math.max(1, sets || 1));
    const seeded = Array.from({ length: n }, () => ({
      weight,
      reps: String(reps),
    }));
    setRows(seeded);
    setPerSet(true);
    onSetDetailsChange(draftsToDetails(seeded));
  }
  function disable() {
    setPerSet(false);
    onSetDetailsChange(null);
  }
  function addRow() {
    if (rows.length >= 20) return;
    const last = rows[rows.length - 1];
    emit([...rows, last ? { ...last } : { weight: "", reps: "10" }]);
  }
  function removeRow(i: number) {
    if (rows.length <= 1) return;
    emit(rows.filter((_, idx) => idx !== i));
  }
  function patch(i: number, key: keyof Draft, val: string) {
    emit(rows.map((r, idx) => (idx === i ? { ...r, [key]: val } : r)));
  }

  const numCls =
    "h-9 w-14 rounded-md border app-field px-2 text-center text-sm";
  const wCls =
    "h-9 w-16 rounded-md border app-field px-2 text-center text-sm";

  // 무게·횟수 고정 끔 → 편집기에선 수치 입력도, 안내 문구도 안 보인다.
  // 세트·무게·횟수 모두 운동모드에서 그때그때 설정·기록한다.
  if (onlySets) {
    return null;
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5 basis-full sm:basis-auto">
      {perSet ? (
        <>
          {rows.map((row, i) => (
            <div key={i} className="flex flex-wrap items-center gap-1.5">
              <span className="w-9 shrink-0 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                {i + 1}세트
              </span>
              <input
                aria-label={`${i + 1}세트 무게(kg)`}
                type="number"
                inputMode="decimal"
                placeholder="kg"
                value={row.weight}
                onChange={(e) => patch(i, "weight", e.target.value)}
                disabled={disabled}
                className={wCls}
              />
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                kg ×
              </span>
              <input
                aria-label={`${i + 1}세트 횟수`}
                type="number"
                inputMode="numeric"
                value={row.reps}
                onChange={(e) => patch(i, "reps", e.target.value)}
                disabled={disabled}
                className={numCls}
              />
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                회
              </span>
              <button
                type="button"
                aria-label="세트 삭제"
                onClick={() => removeRow(i)}
                disabled={disabled || rows.length <= 1}
                className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 dark:text-zinc-500 transition hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 disabled:opacity-40"
              >
                <X aria-hidden="true" size={15} />
              </button>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={addRow}
              disabled={disabled || rows.length >= 20}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-dashed border-zinc-300 dark:border-zinc-600 px-2.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300 transition hover:border-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-400 disabled:opacity-50"
            >
              <Plus aria-hidden="true" size={13} />
              세트 추가
            </button>
            <button
              type="button"
              onClick={disable}
              disabled={disabled}
              className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 underline-offset-2 hover:underline"
            >
              균일하게
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5">
          <input
            aria-label="세트"
            type="number"
            inputMode="numeric"
            value={sets}
            onChange={(e) => onUniformChange({ sets: Number(e.target.value) })}
            disabled={disabled}
            className={numCls}
          />
          <span className="text-xs text-zinc-500 dark:text-zinc-400">세트</span>
          <input
            aria-label="횟수"
            type="number"
            inputMode="numeric"
            value={reps}
            onChange={(e) => onUniformChange({ reps: Number(e.target.value) })}
            disabled={disabled}
            className={numCls}
          />
          <span className="text-xs text-zinc-500 dark:text-zinc-400">회</span>
          <input
            aria-label="무게(kg)"
            type="number"
            inputMode="decimal"
            placeholder="kg"
            value={weight}
            onChange={(e) => onUniformChange({ weight: e.target.value })}
            disabled={disabled}
            className={wCls}
          />
          <button
            type="button"
            onClick={enable}
            disabled={disabled}
            className="inline-flex h-7 items-center rounded-md border app-field px-2 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 transition hover:border-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-400"
          >
            세트별 다르게
          </button>
        </div>
      )}
    </div>
  );
}