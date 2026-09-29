"use client";

import { useEffect, useRef, useState } from "react";

/** 꾹 누르는 시간(ms) — 스쳐 누른 걸로는 끝나지 않게. */
export const HOLD_TO_END_MS = 1000;

/**
 * 꾹 눌러 종료(2026-09-28 런닝 2단계). 예전엔 빨간 '종료'를 스치기만 해도 확인 없이 끝났다.
 * 누르는 동안 테두리가 차오르고, 다 차면 onConfirm. 중간에 떼면 취소. 키보드(Enter·Space 누르고 있기)도 같다.
 */
export function HoldToEnd({
  onConfirm,
  label = "종료",
  className = "",
}: {
  onConfirm: () => void;
  label?: string;
  className?: string;
}) {
  const [progress, setProgress] = useState(0);
  const [hint, setHint] = useState(false);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef(0);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  function tick() {
    if (startRef.current === null) return;
    const p = Math.min(1, (Date.now() - startRef.current) / HOLD_TO_END_MS);
    setProgress(p);
    if (p >= 1) {
      startRef.current = null;
      setProgress(0);
      onConfirm();
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }
  function begin() {
    if (startRef.current !== null) return;
    setHint(false);
    startRef.current = Date.now();
    rafRef.current = requestAnimationFrame(tick);
  }
  function cancel() {
    if (startRef.current === null) return;
    const held = Date.now() - startRef.current;
    startRef.current = null;
    cancelAnimationFrame(rafRef.current);
    setProgress(0);
    // 짧게 눌렀으면 '꾹 누르세요' 안내.
    if (held < HOLD_TO_END_MS) setHint(true);
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        aria-label={`꾹 눌러 ${label}`}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture?.(e.pointerId);
          begin();
        }}
        onPointerUp={cancel}
        onPointerCancel={cancel}
        onPointerLeave={cancel}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !e.repeat) {
            e.preventDefault();
            begin();
          }
        }}
        onKeyUp={(e) => {
          if (e.key === "Enter" || e.key === " ") cancel();
        }}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          background: `conic-gradient(rgb(239 68 68) ${progress * 360}deg, rgba(239,68,68,0.35) 0deg)`,
          touchAction: "none",
        }}
        className={`relative flex h-16 w-16 select-none items-center justify-center rounded-full p-1 text-sm font-bold text-white shadow-lg ${className}`}
      >
        <span className="flex h-full w-full items-center justify-center rounded-full bg-red-500">{label}</span>
      </button>
      <span role="status" className="min-h-4 text-xs font-semibold text-white drop-shadow">
        {hint ? "꾹 누르고 있으면 끝나요" : ""}
      </span>
    </div>
  );
}
