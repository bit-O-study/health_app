"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

import { PlateHint } from "@/features/routine/components/plate-hint";
import { SetSchemePicker } from "@/features/routine/components/set-scheme-picker";
import { describeSetPattern } from "@/features/routine/set-scheme";
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
  exerciseId,
  equipment,
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
  /** 세트 방식의 증량 단위 판단용(종목 크기). 없으면 기구만 보고 정한다. */
  exerciseId?: string;
  /** 원판 안내용 기구. 바벨·스미스·랜드마인이 아니면 안내를 안 그린다. */
  equipment?: string | null;
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

  /** 세트 방식으로 한 번에 채우기 — 세트별 모드로 바꾸면서 값을 넣는다. */
  function applyScheme(details: SetDetail[]) {
    const next = details.map((d) => ({
      weight: d.weightKg === null ? "" : String(d.weightKg),
      reps: String(d.reps),
    }));
    setRows(next);
    setPerSet(true);
    onSetDetailsChange(details);
  }

  const patternLabel = describeSetPattern(draftsToDetails(rows));

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
          {/* 저장된 건 숫자뿐이라, 무게 흐름을 읽어 방식 이름을 되짚어 보여준다. */}
          {patternLabel ? (
            <span className="text-xs font-semibold text-brand">
              {patternLabel}
            </span>
          ) : null}
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
              className="inline-flex h-8 items-center gap-1 rounded-md border border-dashed border-zinc-300 dark:border-zinc-600 px-2.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300 transition hover:border-brand/40 hover:text-brand disabled:opacity-50"
            >
              <Plus aria-hidden="true" size={13} />
              세트 추가
            </button>
            <SetSchemePicker
              sets={rows.length}
              reps={Number(rows[0]?.reps) || reps}
              weightKg={
                rows[0]?.weight.trim() ? Number(rows[0].weight) : null
              }
              exerciseId={exerciseId ?? ""}
              equipment={equipment}
              disabled={disabled}
              onApply={applyScheme}
            />
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
            className="inline-flex h-7 items-center rounded-md border app-field px-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300 transition hover:border-brand/40 hover:text-brand"
          >
            세트별 다르게
          </button>
          {/* 균일 모드에서도 방식만 고르면 바로 세트별로 채워진다 —
              드롭세트를 하려고 먼저 '세트별 다르게' 를 누를 필요가 없다. */}
          <SetSchemePicker
            sets={sets}
            reps={reps}
            weightKg={weight.trim() === "" ? null : Number(weight)}
            exerciseId={exerciseId ?? ""}
            equipment={equipment}
            disabled={disabled}
            onApply={applyScheme}
          />
          {/* 원판 구성 — 바벨·스미스·랜드마인일 때만. 세트별 모드에서는 안 그린다:
              세트마다 무게가 다른데 줄마다 안내를 붙이면 20세트에서 화면이 안내로 덮인다.
              그 경우 필요한 안내는 실제로 끼우는 순간(운동모드)에 나온다. */}
          <div className="basis-full">
            <PlateHint
              weightKg={weight.trim() === "" ? null : Number(weight)}
              equipment={equipment}
              compact
            />
          </div>
        </div>
      )}
    </div>
  );
}