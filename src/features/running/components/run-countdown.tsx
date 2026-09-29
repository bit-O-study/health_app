"use client";

import { useEffect, useRef, useState } from "react";

/** 시작 전 3초 — 폰을 주머니·손목에 두고 자세를 잡을 시간(2026-09-28 런닝 2단계). */
export const RUN_COUNTDOWN_SEC = 3;

export function RunCountdown({ onDone }: { onDone: () => void }) {
  const [left, setLeft] = useState(RUN_COUNTDOWN_SEC);
  // 부모가 매 렌더 새 함수를 넘겨도 타이머가 다시 시작되지 않게 ref 로 든다.
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (left <= 0) {
      onDoneRef.current();
      return;
    }
    const id = window.setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => window.clearTimeout(id);
  }, [left]);

  return (
    <div
      role="status"
      aria-live="assertive"
      data-testid="run-countdown"
      className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-zinc-950/90 text-white"
    >
      <span className="text-sm font-semibold text-zinc-300">곧 시작해요</span>
      <span className="font-bold tabular-nums" style={{ fontSize: 120, lineHeight: 1 }}>
        {left > 0 ? left : "출발!"}
      </span>
    </div>
  );
}
