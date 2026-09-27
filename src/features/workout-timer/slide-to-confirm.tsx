"use client";

import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import { ChevronsRight } from "lucide-react";

import {
  clampSlide,
  slideCompletes,
  type SlidePointer,
} from "@/features/workout-timer/slide-confirm";

/**
 * 밀어서 완료 버튼. 접근성 이름은 `children` 글자 그대로(E2E 가 이름으로 찾는다).
 * 터치는 끝까지 밀어야 `onClick`, 마우스 클릭·키보드는 바로 `onClick`.
 */
export function SlideToConfirm({
  onClick,
  disabled = false,
  className = "",
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const trackRef = useRef<HTMLButtonElement>(null);
  const startRef = useRef<{ x: number; pointer: SlidePointer } | null>(null);
  /** 방금 터치로 처리했다 — 뒤따라오는 합성 click 을 무시한다. */
  const touchHandledRef = useRef(false);
  const [dx, setDx] = useState(0);
  const KNOB = 48;

  function maxDx(): number {
    const w = trackRef.current?.clientWidth ?? 0;
    return Math.max(0, w - KNOB - 8);
  }

  function onDown(e: PointerEvent<HTMLButtonElement>) {
    // 스와이프(운동 이동)와 겹치지 않게 부모로 안 올린다.
    e.stopPropagation();
    if (e.pointerType === "mouse") {
      touchHandledRef.current = false;
      return;
    }
    if (disabled) return;
    startRef.current = { x: e.clientX, pointer: e.pointerType === "pen" ? "pen" : "touch" };
    touchHandledRef.current = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  }
  function onMove(e: PointerEvent<HTMLButtonElement>) {
    e.stopPropagation();
    if (!startRef.current) return;
    setDx(clampSlide(e.clientX - startRef.current.x, maxDx()));
  }
  function onUp(e: PointerEvent<HTMLButtonElement>) {
    e.stopPropagation();
    const s = startRef.current;
    startRef.current = null;
    if (!s) return;
    const done = slideCompletes(s.pointer, e.clientX - s.x, maxDx());
    setDx(0);
    if (done) onClick();
  }
  function onCancel() {
    startRef.current = null;
    setDx(0);
  }

  return (
    <button
      ref={trackRef}
      type="button"
      disabled={disabled}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onCancel}
      onClick={() => {
        // 터치는 위 onUp 이 이미 판정했다(밀었으면 완료, 아니면 무시).
        if (touchHandledRef.current) {
          touchHandledRef.current = false;
          return;
        }
        onClick();
      }}
      style={{ touchAction: "none" }}
      className={`relative select-none overflow-hidden rounded-full p-1 disabled:opacity-40 ${className}`}
    >
      {/* 민 만큼 채워지는 바탕 */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 rounded-full bg-brand/25"
        style={{ width: dx > 0 ? dx + KNOB + 8 : 0 }}
      />
      <span
        aria-hidden="true"
        className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand text-zinc-950 shadow-lg shadow-brand/30"
        style={{
          transform: `translateX(${dx}px)`,
          transition: dx === 0 ? "transform 200ms ease-out" : "none",
        }}
      >
        <ChevronsRight size={22} />
      </span>
      <span className="relative z-10 flex flex-1 items-center justify-center gap-1.5 pr-12 text-base font-semibold">
        {children}
      </span>
    </button>
  );
}
