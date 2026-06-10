"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GripVertical, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  composeDayPlan,
  TONE_STYLES,
  type DayBlockId,
} from "@/features/routine/data";
import { reorderUpcomingSevenDaysAction } from "@/features/routine/actions";
import { useTodayEdit } from "@/features/routine/components/today-edit-scope";

type DayCell = {
  ymd: string;
  weekday: string;
  label: string;
  isToday: boolean;
};

export function UpcomingSevenDaysGrid({
  initialBlocks,
  initialDayIndexes,
  cells,
}: {
  initialBlocks: DayBlockId[][];
  /** 각 화면 위치(0=오늘…6)가 현재 루틴의 몇 일차(day_index)인지. 드래그 순열 추적용. */
  initialDayIndexes: number[];
  cells: DayCell[];
}) {
  const router = useRouter();
  // 순서 변경은 '편집하기' 모드에서만 — 본운동·컨디셔닝과 같은 편집 스코프를 공유.
  const { editMode } = useTodayEdit();
  const [blocks, setBlocks] = useState<DayBlockId[][]>(initialBlocks);
  // 각 화면 위치가 원래 어느 day_index 에서 왔는지(부위 배열만으로는 복원 못 하므로
  // 별도로 추적). 드래그 시 blocks 와 똑같이 splice 해 함께 움직이고, 드롭 때 서버로
  // 보내 본운동 day_index 를 카드와 함께 옮긴다.
  const [order, setOrder] = useState<number[]>(initialDayIndexes);

  // 루틴이 바뀌면(예: '오늘부터 다시 시작', 루틴 변경) 부모가 새 initialBlocks/일차를
  // 내려준다. useState 초기값은 최초 1회만 반영되므로, prop 이 바뀌면 로컬 state 를
  // 동기화해 하단 7일 그리드가 서버 데이터와 어긋나지 않게 한다. (React 권장 패턴)
  // 부위가 같은 두 일차를 바꾸면 initialBlocks 는 그대로여도 initialDayIndexes 는
  // 바뀌므로(저장 후 0~6 정규화) 키에 둘 다 포함해 order 도 확실히 리셋한다.
  const initialKey = JSON.stringify([initialBlocks, initialDayIndexes]);
  const seenKeyRef = useRef(initialKey);
  if (seenKeyRef.current !== initialKey) {
    seenKeyRef.current = initialKey;
    setBlocks(initialBlocks);
    setOrder(initialDayIndexes);
  }
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  /** 드래그 시작 지점부터 현재까지의 이동량 — 잡힌 카드가 마우스/손가락을 따라간다 */
  const [delta, setDelta] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pointerIdRef = useRef<number | null>(null);

  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function indexFromPoint(clientX: number, clientY: number): number | null {
    const el = document.elementFromPoint(
      clientX,
      clientY,
    ) as HTMLElement | null;
    if (!el) return null;
    const card = el.closest("[data-day-index]") as HTMLElement | null;
    if (!card) return null;
    const idx = Number(card.dataset.dayIndex);
    if (Number.isNaN(idx)) return null;
    return idx;
  }

  function tryVibrate(ms: number) {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(ms);
      } catch {
        /* noop */
      }
    }
  }

  function onPointerDown(index: number, e: React.PointerEvent<HTMLDivElement>) {
    if (!editMode) return; // 편집모드에서만 드래그 가능
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointerIdRef.current = e.pointerId;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    setDelta({ x: 0, y: 0 });
    setDraggedIndex(index);
    setHoverIndex(index);
    setErr(null);
    tryVibrate(15);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (draggedIndex === null || e.pointerId !== pointerIdRef.current) return;
    e.preventDefault();
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setDelta({ x: dx, y: dy });
    const idx = indexFromPoint(e.clientX, e.clientY);
    if (idx !== null) setHoverIndex(idx);
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (draggedIndex === null || e.pointerId !== pointerIdRef.current) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
    pointerIdRef.current = null;
    const from = draggedIndex;
    const to = hoverIndex;
    const snapshot = blocks;
    const orderSnapshot = order;

    setDraggedIndex(null);
    setHoverIndex(null);
    setDelta({ x: 0, y: 0 });

    if (to === null || from === to) return;

    const next = [...snapshot];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setBlocks(next);

    // 순열도 똑같이 splice — nextOrder[newPos] = 원래 day_index.
    const nextOrder = [...orderSnapshot];
    const [movedIdx] = nextOrder.splice(from, 1);
    nextOrder.splice(to, 0, movedIdx);
    setOrder(nextOrder);
    tryVibrate(10);

    start(async () => {
      const res = await reorderUpcomingSevenDaysAction(next, nextOrder);
      if (res.ok) {
        // 저장 후 서버는 start_date=오늘 + day_index 를 화면 위치로 정규화한다 →
        // 로컬 순열도 항등(0~6)으로 리셋해 다음 드래그가 올바른 기준에서 계산되게.
        setOrder(next.map((_, i) => i));
        router.refresh();
      } else {
        setErr(res.error);
        setBlocks(snapshot);
        setOrder(orderSnapshot);
      }
    });
  }

  function onPointerCancel(e: React.PointerEvent<HTMLDivElement>) {
    if (draggedIndex === null) return;
    if (e.pointerId !== pointerIdRef.current) return;
    pointerIdRef.current = null;
    setDraggedIndex(null);
    setHoverIndex(null);
    setDelta({ x: 0, y: 0 });
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          다가오는 7일
          <span className="ml-1.5 normal-case tracking-normal text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
            {editMode ? "· 드래그로 순서 변경" : "· '편집하기'에서 순서 변경"}
          </span>
        </h2>
        {pending ? (
          <span className="inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
            <Loader2 aria-hidden="true" className="animate-spin" size={13} />
            저장 중
          </span>
        ) : null}
      </div>

      <div className="relative grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {blocks.map((dayBlocks, i) => {
          const cell = cells[i];
          const dayPlan = composeDayPlan(dayBlocks);
          const isRest = dayPlan.tone === "rest";
          const style = TONE_STYLES[dayPlan.tone];
          const isDragged = draggedIndex === i;
          const isHoverTarget =
            hoverIndex === i && draggedIndex !== null && draggedIndex !== i;

          // 잡힌 카드: 손가락 따라 들려서 이동. 비켜줄 카드: 살짝 줄어듦.
          // pointerEvents:"none" — 드래그 카드를 elementFromPoint 의 hit-test 에서 제외해서
          // 그 아래에 있는 진짜 드롭 타겟이 hoverIndex 로 잡히게 함.
          // (setPointerCapture 가 잡혀 있어 onPointerMove/Up 은 그대로 들어옴)
          const liftStyle: React.CSSProperties = isDragged
            ? {
                transform: `translate3d(${delta.x}px, ${delta.y}px, 0) scale(1.06)`,
                boxShadow:
                  "0 18px 36px rgba(0,0,0,0.18), 0 4px 10px rgba(0,0,0,0.08)",
                zIndex: 30,
                opacity: 0.96,
                transition: "none",
                touchAction: "none",
                pointerEvents: "none",
              }
            : isHoverTarget
              ? {
                  transform: "scale(0.94)",
                  transition: "transform 180ms ease",
                  touchAction: "none",
                }
              : {
                  transform: "scale(1)",
                  transition: "transform 180ms ease",
                  touchAction: "none",
                };

          return (
            <div
              key={cell.ymd}
              data-day-index={i}
              onPointerDown={(e) => onPointerDown(i, e)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerCancel}
              onContextMenu={(e) => e.preventDefault()}
              style={liftStyle}
              className={cn(
                "relative select-none rounded-lg border p-3",
                editMode ? "cursor-grab active:cursor-grabbing" : "",
                style.card,
                cell.isToday ? "ring-2 ring-emerald-500 ring-offset-1" : "",
                isDragged
                  ? "border-emerald-500 ring-2 ring-emerald-300/70"
                  : "",
                isHoverTarget
                  ? "border-emerald-400 ring-2 ring-emerald-400/60"
                  : "",
              )}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="flex min-w-0 items-center gap-1 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {editMode ? (
                    <GripVertical
                      aria-hidden="true"
                      className={cn(
                        "shrink-0 transition-colors",
                        isDragged
                          ? "text-emerald-600"
                          : "text-zinc-400 dark:text-zinc-500",
                      )}
                      size={13}
                    />
                  ) : null}
                  <span className="truncate">
                    {cell.weekday}
                    <span className="ml-1.5 text-xs font-normal text-zinc-500 dark:text-zinc-400">
                      {cell.label}
                    </span>
                  </span>
                </span>
                {cell.isToday ? (
                  <span className="shrink-0 rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    오늘
                  </span>
                ) : null}
              </div>
              <span
                className={cn(
                  "mt-2 inline-flex min-w-0 max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  style.badge,
                )}
              >
                <span
                  className={cn("h-1 w-1 shrink-0 rounded-full", style.dot)}
                />
                <span className="truncate">
                  {isRest ? "휴식" : dayPlan.focus}
                </span>
              </span>
            </div>
          );
        })}
      </div>

      {err ? (
        <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
          {err}
        </p>
      ) : null}
    </section>
  );
}
