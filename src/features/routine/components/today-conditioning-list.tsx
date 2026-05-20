"use client";

import { useRef, useState, useTransition, type PointerEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Check,
  ChevronRight,
  Dumbbell,
  GripVertical,
  Trash2,
  X,
} from "lucide-react";

import { reorderConditioningAction } from "@/features/routine/conditioning-actions";
import { setConditioningStatusAction } from "@/features/routine/conditioning-completion-actions";
import { deleteConditioningRowAction } from "@/features/routine/delete-actions";
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

export function TodayConditioningList({
  kind,
  items,
  doneIds,
  skippedIds,
  iconTone,
  source,
  focus,
  dateYmd,
  editMode = false,
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
  editMode?: boolean;
}) {
  const router = useRouter();
  const [order, setOrder] = useState(items);
  const [done, setDone] = useState<Set<string>>(new Set(doneIds));
  const [skipped, setSkipped] = useState<Set<string>>(new Set(skippedIds));
  const [swipe, setSwipe] = useState<{ id: string; dx: number } | null>(null);
  const startRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dxRef = useRef(0);
  const lockedRef = useRef<"none" | "horizontal" | "vertical">("none");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
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

  function handleHandleDragStart(e: React.DragEvent, index: number) {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    try {
      e.dataTransfer.setData("text/plain", String(index));
    } catch {
      /* noop */
    }
  }
  function handleDragOver(e: React.DragEvent) {
    if (dragIndex === null) return;
    e.preventDefault();
  }
  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      return;
    }
    const next = [...order];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    setOrder(next);
    setDragIndex(null);
    persistOrder(next);
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
    setSwipe(null);
    dxRef.current = 0;
    lockedRef.current = "none";
  }

  function remove(rowId: string) {
    setOrder((prev) => prev.filter((i) => i.rowId !== rowId));
    setDone((prev) => {
      const n = new Set(prev);
      n.delete(rowId);
      return n;
    });
    setSkipped((prev) => {
      const n = new Set(prev);
      n.delete(rowId);
      return n;
    });
    startTx(async () => {
      await deleteConditioningRowAction(rowId);
      router.refresh();
    });
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

        return (
          <li
            key={item.rowId}
            className="relative overflow-hidden rounded-xl"
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(index)}
          >
            {dragIndex === index ? null : (
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
              style={{
                transform: `translateX(${dx}px)`,
                transition: isSwiping ? "none" : "transform 220ms ease-out",
                touchAction: "pan-y",
              }}
              className={`relative flex items-center gap-3 border bg-white p-4 shadow-sm ${
                dragIndex === index
                  ? "border-emerald-400 opacity-60"
                  : isDone
                    ? "border-emerald-300 bg-emerald-50"
                    : isSkipped
                      ? "border-zinc-300 bg-zinc-100"
                      : "border-zinc-200"
              }`}
            >
              <span
                draggable
                onDragStart={(e) => handleHandleDragStart(e, index)}
                onDragEnd={() => setDragIndex(null)}
                aria-hidden="true"
                className="flex h-8 w-6 shrink-0 cursor-grab items-center justify-center text-zinc-400 active:cursor-grabbing"
                title="잡고 위·아래로 순서 변경"
              >
                <GripVertical size={18} />
              </span>

              {editMode ? (
                <button
                  type="button"
                  aria-label="삭제"
                  title="이 운동을 삭제 — 기록·점수에서도 함께 제거"
                  onPointerDown={(e) => e.stopPropagation()}
                  onPointerMove={(e) => e.stopPropagation()}
                  onPointerUp={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (
                      confirm(
                        "이 운동을 삭제할까요? 기록·점수에서도 함께 사라집니다.",
                      )
                    ) {
                      remove(item.rowId);
                    }
                  }}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-red-300 bg-red-50 text-red-700 transition hover:bg-red-100"
                >
                  <Trash2 aria-hidden="true" size={15} />
                </button>
              ) : null}

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
