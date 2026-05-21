"use client";

import { useRef, useState, useTransition, type PointerEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, ChevronRight, GripVertical, X } from "lucide-react";

import { reorderConditioningAction } from "@/features/routine/conditioning-actions";
import { setConditioningStatusAction } from "@/features/routine/conditioning-completion-actions";
import { useTodayEdit } from "@/features/routine/components/today-edit-scope";
import { ConditioningIcon } from "@/features/exercises/components/conditioning-icon";
import type { ConditioningKind } from "@/features/routine/conditioning-catalog";
import type { CompletionStatus } from "@/features/routine/exercise-completions";

export type TodayConditioningItem = {
  rowId: string;
  itemId: string;
  name: string;
  detail: string;
  kcal: number;
  durationMin: number | null;
  speed: number | null;
  incline: number | null;
};

const SWIPE_THRESHOLD = 80;
const SWIPE_VISUAL_CAP = 120;
const ROW_HEIGHT_PX = 80;
const LONG_PRESS_MS = 280;
const LONG_PRESS_MOVE_TOLERANCE = 6;

export function TodayConditioningList({
  kind,
  items,
  doneIds,
  skippedIds,
  iconTone,
  source,
  focus,
  dateYmd,
}: {
  kind: ConditioningKind;
  items: TodayConditioningItem[];
  doneIds: string[];
  skippedIds: string[];
  iconTone: "amber" | "sky";
  /** 현재 보이는 데이터 소스 — 정렬 시 어느 테이블에 저장할지 결정 */
  source: "daily" | "default";
  focus?: string;
  dateYmd?: string;
}) {
  const edit = useTodayEdit();
  const editMode = edit.editMode;
  const router = useRouter();
  const [order, setOrder] = useState(items);
  const [done, setDone] = useState<Set<string>>(new Set(doneIds));
  const [skipped, setSkipped] = useState<Set<string>>(new Set(skippedIds));
  const [swipe, setSwipe] = useState<{ id: string; dx: number } | null>(null);
  const startRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dxRef = useRef(0);
  const lockedRef = useRef<"none" | "horizontal" | "vertical">("none");
  // long-press → 드래그 진입 (행 본체 어디서나)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const justDraggedRef = useRef(false);
  function clearLongPress() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }
  // 포인터 기반 드래그 (오늘운동 본운동과 동일 패턴)
  const [drag, setDrag] = useState<{
    index: number;
    dy: number;
    pointerId: number;
  } | null>(null);
  const dragStartYRef = useRef(0);
  const dragIndex = drag?.index ?? null;
  const newIndex =
    drag !== null
      ? Math.max(
          0,
          Math.min(
            order.length - 1,
            drag.index + Math.round(drag.dy / ROW_HEIGHT_PX),
          ),
        )
      : null;
  const [, startTx] = useTransition();

  function setStatus(
    rowId: string,
    itemId: string,
    target: CompletionStatus | "clear",
  ) {
    const item = order.find((o) => o.rowId === rowId);
    const nextDone = new Set(done);
    const nextSkipped = new Set(skipped);
    nextDone.delete(rowId);
    nextSkipped.delete(rowId);
    if (target === "done") nextDone.add(rowId);
    else if (target === "skipped") nextSkipped.add(rowId);
    setDone(nextDone);
    setSkipped(nextSkipped);
    startTx(async () => {
      await setConditioningStatusAction(
        kind,
        rowId,
        itemId,
        target,
        target === "clear" || !item
          ? undefined
          : {
              durationMin: item.durationMin,
              speed: item.speed,
              incline: item.incline,
            },
      );
      router.refresh();
    });
  }

  function persistOrder(next: TodayConditioningItem[]) {
    startTx(async () => {
      await reorderConditioningAction({
        source,
        kind,
        focus,
        dateYmd,
        ids: next.map((i) => i.rowId),
      });
      router.refresh();
    });
  }

  function onGripPointerDown(e: PointerEvent<HTMLSpanElement>, index: number) {
    e.stopPropagation();
    if (e.pointerType === "mouse" && e.button !== 0) return;
    dragStartYRef.current = e.clientY;
    setDrag({ index, dy: 0, pointerId: e.pointerId });
    e.currentTarget.setPointerCapture(e.pointerId);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(15);
      } catch {
        /* noop */
      }
    }
  }
  function onGripPointerMove(e: PointerEvent<HTMLSpanElement>) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    e.stopPropagation();
    e.preventDefault();
    const dy = e.clientY - dragStartYRef.current;
    setDrag((prev) => (prev ? { ...prev, dy } : null));
  }
  function onGripPointerUp(e: PointerEvent<HTMLSpanElement>) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    e.stopPropagation();
    const target = newIndex;
    const source = drag.index;
    setDrag(null);
    if (target !== null && target !== source) {
      const next = [...order];
      const [moved] = next.splice(source, 1);
      next.splice(target, 0, moved);
      setOrder(next);
      persistOrder(next);
    }
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>, id: string) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    startRef.current = { x: e.clientX, y: e.clientY };
    dxRef.current = 0;
    lockedRef.current = "none";
    setSwipe({ id, dx: 0 });
    e.currentTarget.setPointerCapture(e.pointerId);
    clearLongPress();
    const pointerId = e.pointerId;
    const index = order.findIndex((o) => o.rowId === id);
    if (index < 0) return;
    longPressTimerRef.current = setTimeout(() => {
      longPressTimerRef.current = null;
      setSwipe(null);
      dxRef.current = 0;
      lockedRef.current = "none";
      setDrag({ index, dy: 0, pointerId });
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate(20);
        } catch {
          /* noop */
        }
      }
    }, LONG_PRESS_MS);
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (drag && e.pointerId === drag.pointerId) {
      e.preventDefault();
      const dy = e.clientY - startRef.current.y;
      setDrag((prev) => (prev ? { ...prev, dy } : null));
      return;
    }
    if (longPressTimerRef.current) {
      const md = Math.hypot(
        e.clientX - startRef.current.x,
        e.clientY - startRef.current.y,
      );
      if (md > LONG_PRESS_MOVE_TOLERANCE) clearLongPress();
    }
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
      if (done.has(swipe.id)) capped = Math.max(0, capped);
      if (skipped.has(swipe.id)) capped = Math.min(0, capped);
      dxRef.current = capped;
      setSwipe((p) => (p ? { ...p, dx: capped } : null));
    }
  }
  function onPointerUp(
    e: PointerEvent<HTMLDivElement>,
    rowId: string,
    itemId: string,
  ) {
    clearLongPress();
    if (drag && e.pointerId === drag.pointerId) {
      const source = drag.index;
      const target = newIndex;
      setDrag(null);
      if (target !== null && target !== source) {
        const next = [...order];
        const [moved] = next.splice(source, 1);
        next.splice(target, 0, moved);
        setOrder(next);
        persistOrder(next);
      }
      justDraggedRef.current = true;
      setTimeout(() => {
        justDraggedRef.current = false;
      }, 250);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
      return;
    }
    const dx = dxRef.current;
    setSwipe(null);
    dxRef.current = 0;
    lockedRef.current = "none";
    const isDone = done.has(rowId);
    const isSkipped = skipped.has(rowId);
    if (dx > SWIPE_THRESHOLD && !isSkipped) {
      setStatus(rowId, itemId, isDone ? "clear" : "done");
    } else if (dx < -SWIPE_THRESHOLD && !isDone) {
      setStatus(rowId, itemId, isSkipped ? "clear" : "skipped");
    }
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  }
  function onPointerCancel() {
    clearLongPress();
    setSwipe(null);
    dxRef.current = 0;
    lockedRef.current = "none";
    if (drag) setDrag(null);
  }

  const iconBg =
    iconTone === "amber"
      ? "bg-amber-100 text-amber-700"
      : "bg-sky-100 text-sky-700";

  return (
    <ul className="space-y-2">
      {order.map((item, index) => {
        const isDone = done.has(item.rowId);
        const isSkipped = skipped.has(item.rowId);
        const dx = swipe?.id === item.rowId ? swipe.dx : 0;
        const isSwiping = swipe?.id === item.rowId && Math.abs(dx) > 4;
        const passedRight = dx > SWIPE_THRESHOLD;
        const passedLeft = dx < -SWIPE_THRESHOLD;

        const isDragging = dragIndex === index;
        let liftOtherY = 0;
        if (drag !== null && newIndex !== null && !isDragging) {
          if (drag.index < index && index <= newIndex) liftOtherY = -ROW_HEIGHT_PX;
          else if (drag.index > index && index >= newIndex) liftOtherY = ROW_HEIGHT_PX;
        }
        const liftStyle = isDragging
          ? {
              transform: `translate3d(0, ${drag!.dy}px, 0) scale(1.04)`,
              boxShadow:
                "0 18px 36px rgba(0,0,0,0.18), 0 4px 10px rgba(0,0,0,0.08)",
              zIndex: 30,
              transition: "none",
              opacity: 0.97,
            }
          : {
              transform: `translateY(${liftOtherY}px)`,
              transition: "transform 200ms ease",
            };

        return (
          <li
            key={item.rowId}
            className="relative overflow-hidden rounded-xl"
            style={liftStyle}
          >
            {isDragging ? null : (
              <>
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
              </>
            )}

            <div
              onPointerDown={(e) => onPointerDown(e, item.rowId)}
              onPointerMove={onPointerMove}
              onPointerUp={(e) => onPointerUp(e, item.rowId, item.itemId)}
              onPointerCancel={onPointerCancel}
              onContextMenu={(e) => e.preventDefault()}
              style={{
                transform: `translateX(${dx}px)`,
                transition: isSwiping ? "none" : "transform 220ms ease-out",
                touchAction: "pan-y",
                WebkitTouchCallout: "none",
                WebkitUserSelect: "none",
                userSelect: "none",
              }}
              className={`relative flex select-none items-center gap-3 border bg-white p-4 shadow-sm ${
                isDragging
                  ? "border-emerald-500 ring-2 ring-emerald-300/70"
                  : isDone
                    ? "border-emerald-300 bg-emerald-50"
                    : isSkipped
                      ? "border-zinc-300 bg-zinc-100"
                      : "border-zinc-200"
              }`}
            >
              <span
                onPointerDown={(e) => onGripPointerDown(e, index)}
                onPointerMove={onGripPointerMove}
                onPointerUp={onGripPointerUp}
                onPointerCancel={onGripPointerUp}
                aria-hidden="true"
                className={`flex h-10 w-8 shrink-0 cursor-grab items-center justify-center transition-colors ${
                  isDragging ? "text-emerald-600" : "text-zinc-400"
                } active:cursor-grabbing`}
                style={{ touchAction: "none" }}
                title="잡고 위·아래로 순서 변경"
              >
                <GripVertical size={20} />
              </span>

              {editMode ? (
                <input
                  type="checkbox"
                  aria-label="선택"
                  checked={edit.selectedCond.has(item.rowId)}
                  onPointerDown={(e) => e.stopPropagation()}
                  onPointerMove={(e) => e.stopPropagation()}
                  onPointerUp={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => edit.toggleCond(item.rowId)}
                  className="h-5 w-5 shrink-0 accent-red-600"
                />
              ) : null}

              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBg}`}
              >
                <ConditioningIcon id={item.itemId} size={22} />
              </span>
              <Link
                href={`/conditioning/${item.itemId}`}
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
                onContextMenu={(e) => e.preventDefault()}
                onClick={(e) => {
                  if (Math.abs(dx) > 4 || justDraggedRef.current) {
                    e.preventDefault();
                  }
                }}
                className="group flex min-w-0 flex-1 items-center gap-2"
              >
                <div className="min-w-0 flex-1">
                  <h4 className="text-base font-bold text-zinc-950">
                    {item.name}
                    {isDone ? (
                      <span className="ml-2 whitespace-nowrap rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        완료
                      </span>
                    ) : null}
                    {isSkipped ? (
                      <span className="ml-2 whitespace-nowrap rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-bold text-zinc-700">
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
