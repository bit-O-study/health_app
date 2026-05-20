"use client";

import { useRef, useState, useTransition, type PointerEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, ChevronRight, Dumbbell, X } from "lucide-react";

import { setConditioningStatusAction } from "@/features/routine/conditioning-completion-actions";
import type { ConditioningKind } from "@/features/routine/conditioning-catalog";
import type { CompletionStatus } from "@/features/routine/exercise-completions";

export type TodayConditioningItem = {
  /** routine_conditioning 또는 daily_conditioning row id (key 용) */
  rowId: string;
  /** 카탈로그 item id (완료/휴식 키) */
  itemId: string;
  name: string;
  detail: string;
  kcal: number;
};

const SWIPE_THRESHOLD = 80;
const SWIPE_VISUAL_CAP = 120;

export function TodayConditioningList({
  kind,
  items,
  doneIds,
  skippedIds,
  iconTone,
}: {
  kind: ConditioningKind;
  items: TodayConditioningItem[];
  doneIds: string[];
  skippedIds: string[];
  iconTone: "amber" | "sky";
}) {
  const router = useRouter();
  const [done, setDone] = useState<Set<string>>(new Set(doneIds));
  const [skipped, setSkipped] = useState<Set<string>>(new Set(skippedIds));
  const [swipe, setSwipe] = useState<{ id: string; dx: number } | null>(null);
  const startRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dxRef = useRef(0);
  const lockedRef = useRef<"none" | "horizontal" | "vertical">("none");
  const [, startTx] = useTransition();

  function setStatus(
    itemId: string,
    target: CompletionStatus | "clear",
  ) {
    const nextDone = new Set(done);
    const nextSkipped = new Set(skipped);
    nextDone.delete(itemId);
    nextSkipped.delete(itemId);
    if (target === "done") nextDone.add(itemId);
    else if (target === "skipped") nextSkipped.add(itemId);
    setDone(nextDone);
    setSkipped(nextSkipped);
    startTx(async () => {
      await setConditioningStatusAction(kind, itemId, target);
      router.refresh();
    });
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>, id: string) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    startRef.current = { x: e.clientX, y: e.clientY };
    dxRef.current = 0;
    lockedRef.current = "none";
    setSwipe({ id, dx: 0 });
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!swipe) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    if (lockedRef.current === "none") {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dx) > Math.abs(dy)) lockedRef.current = "horizontal";
      else {
        lockedRef.current = "vertical";
        setSwipe(null);
        return;
      }
    }
    if (lockedRef.current === "horizontal") {
      e.preventDefault();
      let capped = Math.max(
        -SWIPE_VISUAL_CAP,
        Math.min(SWIPE_VISUAL_CAP, dx),
      );
      // swipe.id 는 rowId 인데 상태 키는 itemId (rowId 와 다를 수 있음)
      // 현재 swiping 중인 row 의 itemId 를 찾아 상태 차단
      const cur = items.find((i) => i.rowId === swipe.id);
      if (cur) {
        if (done.has(cur.itemId)) capped = Math.max(0, capped);
        if (skipped.has(cur.itemId)) capped = Math.min(0, capped);
      }
      dxRef.current = capped;
      setSwipe((p) => (p ? { ...p, dx: capped } : null));
    }
  }
  function onPointerUp(e: PointerEvent<HTMLDivElement>, itemId: string) {
    const dx = dxRef.current;
    setSwipe(null);
    dxRef.current = 0;
    lockedRef.current = "none";
    const isDone = done.has(itemId);
    const isSkipped = skipped.has(itemId);
    if (dx > SWIPE_THRESHOLD && !isSkipped) {
      setStatus(itemId, isDone ? "clear" : "done");
    } else if (dx < -SWIPE_THRESHOLD && !isDone) {
      setStatus(itemId, isSkipped ? "clear" : "skipped");
    }
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  }
  function onPointerCancel() {
    setSwipe(null);
    dxRef.current = 0;
    lockedRef.current = "none";
  }

  const iconBg =
    iconTone === "amber"
      ? "bg-amber-100 text-amber-700"
      : "bg-sky-100 text-sky-700";

  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const isDone = done.has(item.itemId);
        const isSkipped = skipped.has(item.itemId);
        const dx = swipe?.id === item.rowId ? swipe.dx : 0;
        const isSwiping = swipe?.id === item.rowId && Math.abs(dx) > 4;
        const passedRight = dx > SWIPE_THRESHOLD;
        const passedLeft = dx < -SWIPE_THRESHOLD;

        return (
          <li
            key={item.rowId}
            className="relative overflow-hidden rounded-xl"
          >
            <div
              className={`pointer-events-none absolute inset-y-0 left-0 flex w-1/2 items-center pl-5 text-sm font-bold transition-colors ${
                passedRight
                  ? "bg-emerald-600 text-white"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              <Check aria-hidden="true" size={18} />
              <span className="ml-2">{isDone ? "취소" : "완료"}</span>
            </div>
            <div
              className={`pointer-events-none absolute inset-y-0 right-0 flex w-1/2 items-center justify-end pr-5 text-sm font-bold transition-colors ${
                passedLeft
                  ? "bg-zinc-600 text-white"
                  : "bg-zinc-200 text-zinc-700"
              }`}
            >
              <span className="mr-2">{isSkipped ? "취소" : "휴식"}</span>
              <X aria-hidden="true" size={18} />
            </div>

            <div
              onPointerDown={(e) => onPointerDown(e, item.rowId)}
              onPointerMove={onPointerMove}
              onPointerUp={(e) => onPointerUp(e, item.itemId)}
              onPointerCancel={onPointerCancel}
              style={{
                transform: `translateX(${dx}px)`,
                transition: isSwiping ? "none" : "transform 220ms ease-out",
                touchAction: "pan-y",
              }}
              className={`relative flex items-center gap-3 border bg-white p-4 shadow-sm ${
                isDone
                  ? "border-emerald-200 bg-emerald-50"
                  : isSkipped
                    ? "border-zinc-200 bg-zinc-100"
                    : "border-zinc-200"
              }`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBg}`}
              >
                <Dumbbell aria-hidden="true" size={20} />
              </span>
              <Link
                href={`/conditioning/${item.itemId}`}
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
                onClick={(e) => {
                  if (Math.abs(dx) > 4) e.preventDefault();
                }}
                className="group flex min-w-0 flex-1 items-center gap-2"
              >
                <div className="min-w-0 flex-1">
                  <h4 className="text-base font-bold text-zinc-950">
                    {item.name}
                    {isDone ? (
                      <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        완료
                      </span>
                    ) : null}
                    {isSkipped ? (
                      <span className="ml-2 rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-bold text-zinc-700">
                        오늘 휴식
                      </span>
                    ) : null}
                  </h4>
                  <p className="mt-0.5 text-sm text-zinc-600">
                    {item.detail}
                    <span className="ml-2 text-xs text-orange-700">
                      · 약 {item.kcal}kcal
                    </span>
                  </p>
                </div>
                <ChevronRight
                  aria-hidden="true"
                  className="shrink-0 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-emerald-700"
                  size={18}
                />
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
