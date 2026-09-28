"use client";
import { useRef, useState, type PointerEvent } from "react";

export function NumberScrubber({
  label,
  value,
  unit,
  min,
  max,
  step,
  allowBodyweight = false,
  onChange,
}: {
  label: string;
  value: number | null;
  unit: string;
  min: number;
  max: number;
  step: number;
  allowBodyweight?: boolean;
  onChange: (v: number | null) => void;
}) {
  const startRef = useRef<{ x: number; base: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const PX_PER_STEP = 12;
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const round = (v: number) => Math.round(v / step) * step;

  function applyDelta(base: number, dxSteps: number) {
    const nv = round(base + dxSteps * step);
    if (allowBodyweight && nv < min) onChange(null);
    else onChange(clamp(nv));
  }
  function onDown(e: PointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
    startRef.current = { x: e.clientX, base: value ?? min };
  }
  function onMove(e: PointerEvent<HTMLDivElement>) {
    if (!startRef.current) return;
    e.stopPropagation();
    const dxSteps = Math.round((e.clientX - startRef.current.x) / PX_PER_STEP);
    applyDelta(startRef.current.base, dxSteps);
  }
  function onUp(e: PointerEvent<HTMLDivElement>) {
    startRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  }
  function dec() {
    if (value === null) return onChange(min);
    const nv = value - step;
    if (allowBodyweight && nv < min) onChange(null);
    else onChange(clamp(nv));
  }
  function inc() {
    onChange(value === null ? min : clamp(value + step));
  }
  // 더블클릭 직접 입력 — 빈칸은 (맨몸 허용 시) 맨몸, 아니면 변경 없음. step 단위로 스냅.
  function commitInput() {
    const raw = inputRef.current?.value.trim() ?? "";
    setEditing(false);
    if (raw === "") {
      if (allowBodyweight) onChange(null);
      return;
    }
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    if (allowBodyweight && n < min) return onChange(null);
    onChange(clamp(round(n)));
  }
  const display = value === null ? "맨몸" : String(value);

  const btn =
    "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-lg text-zinc-600 transition hover:bg-zinc-200 dark:bg-white/10 dark:text-zinc-200 dark:hover:bg-white/15";

  // 타일 한 칸 — 라벨 · 값(끌기/더블클릭) · ± . 세 칸을 가로로 나란히 둔다(영상 자리를 넓게).
  return (
    <div className="flex min-w-0 flex-col items-center gap-1.5 rounded-2xl border border-zinc-200 bg-zinc-50 px-0.5 pb-2.5 pt-2 dark:border-white/10 dark:bg-white/5">
      <button type="button" aria-label={`${label} 직접 입력`} onClick={(e) => { e.stopPropagation(); setEditing(true); }} className="min-h-11 px-2 text-xs text-zinc-500 underline underline-offset-4 dark:text-zinc-400">{label} 입력</button>
      {editing ? (
        <input
          ref={inputRef}
          type="number"
          inputMode="decimal"
          aria-label={`${label} 직접 입력`}
          autoFocus
          defaultValue={value ?? ""}
          onFocus={(e) => e.currentTarget.select()}
          onBlur={commitInput}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitInput();
            } else if (e.key === "Escape") {
              e.preventDefault();
              setEditing(false);
            }
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="h-9 w-full rounded-xl border border-brand/40 bg-white px-1 text-center text-xl font-semibold tabular-nums text-brand outline-none focus:border-brand/40 dark:bg-zinc-900"
        />
      ) : (
        <div
          role="slider"
          aria-label={label}
          aria-valuenow={value ?? 0}
          title="좌우로 끌거나 더블클릭해 직접 입력"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onDoubleClick={(e) => {
            e.stopPropagation();
            setEditing(true);
          }}
          style={{ touchAction: "none" }}
          className="flex h-9 w-full cursor-ew-resize select-none items-baseline justify-center gap-0.5 pt-0.5"
        >
          <span className="text-xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-50">
            {display}
          </span>
          {value !== null ? (
            <span className="text-xs text-muted">{unit}</span>
          ) : null}
        </div>
      )}
      <div className="flex items-center gap-0.5">
        <button type="button" aria-label={`${label} 줄이기`} onClick={dec} className={"min-h-11 min-w-11 " + (btn)}>
          −
        </button>
        <button type="button" aria-label={`${label} 늘리기`} onClick={inc} className={"min-h-11 min-w-11 " + (btn)}>
          +
        </button>
      </div>
    </div>
  );
}
