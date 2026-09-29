"use client";

import { useEffect, useState } from "react";

import {
  SLOT_LABEL,
  captionFor,
  photoSlotAt,
  type CaptionSlot,
} from "@/features/workout-timer/motion-caption";

/**
 * 영상·사진 아래 한 줄 자막 — 한 줄 코치(2026-09-29).
 * 화면을 늘리지 않으려고 **딱 한 줄(최대 두 줄)**. 앞의 점 세 개가 지금이 준비·동작·돌아오기
 * 중 어디인지 보여 준다. 화면 읽기 프로그램에는 매번 읽히지 않게 aria-live 를 끈다
 * (0.4초마다 바뀌는 말을 계속 읽으면 방해가 된다).
 */
export function MotionCaptionLine({
  steps,
  slot,
  synced,
}: {
  steps: readonly string[];
  slot: CaptionSlot;
  /** 영상·사진 동작에 맞춰 바뀌는지(false 면 시간 순서로만 넘어간다). */
  synced: boolean;
}) {
  const text = captionFor(steps, slot);
  if (!text) return null;
  return (
    <div
      data-testid="motion-caption"
      data-slot={slot}
      data-synced={synced ? "1" : "0"}
      aria-live="off"
      className="mt-2 flex w-full max-w-md items-start gap-2.5 rounded-2xl bg-zinc-100 px-3 py-2.5 dark:bg-white/[0.07]"
    >
      <span className="mt-0.5 flex shrink-0 flex-col items-center gap-1">
        <span className="text-xs font-bold leading-none text-brand">{SLOT_LABEL[slot]}</span>
        <span aria-hidden="true" className="flex gap-0.5">
          {([0, 1, 2] as const).map((i) => (
            <span
              key={i}
              className={`h-1 w-1 rounded-full ${i === slot ? "bg-brand" : "bg-zinc-300 dark:bg-zinc-600"}`}
            />
          ))}
        </span>
      </span>
      <p key={`${slot}:${text}`} className="motion-caption-in line-clamp-2 min-w-0 flex-1 text-base font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
        {text}
      </p>
    </div>
  );
}

/** 사진 두 장 교차 재생에 맞춘 칸 — 사진 CSS 애니메이션과 같은 주기로 마운트 시점부터 센다. */
export function usePhotoSlot(cycleMs: number): CaptionSlot {
  const [slot, setSlot] = useState<CaptionSlot>(0);
  useEffect(() => {
    const t0 = performance.now();
    const id = window.setInterval(() => setSlot(photoSlotAt(performance.now() - t0, cycleMs)), 150);
    return () => window.clearInterval(id);
  }, [cycleMs]);
  return slot;
}

/** 동작 사양을 모르는 영상(유튜브·관리자 영상 등) — 3.2초마다 다음 줄로. 동작과 맞추지는 않는다. */
export function useTimedSlot(stepMs = 3200): CaptionSlot {
  const [slot, setSlot] = useState<CaptionSlot>(0);
  useEffect(() => {
    const id = window.setInterval(() => setSlot((s) => ((s + 1) % 3) as CaptionSlot), stepMs);
    return () => window.clearInterval(id);
  }, [stepMs]);
  return slot;
}
