"use client";

import { useRef, useState, useTransition, type PointerEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronRight,
  GripVertical,
  Loader2,
  Pencil,
  Plus,
  StickyNote,
  X,
} from "lucide-react";

import {
  addConditioningToTodayAction,
  reorderConditioningAction,
  updateConditioningMemoAction,
  updateConditioningRowAction,
} from "@/features/routine/conditioning-actions";
import { setConditioningStatusAction } from "@/features/routine/conditioning-completion-actions";
import { useTodayEdit } from "@/features/routine/components/today-edit-scope";
import { useTodayOrder } from "@/features/routine/components/today-order-scope";
import { ConditioningIcon } from "@/features/exercises/components/conditioning-icon";
import {
  conditioningOptions,
  getConditioningItem,
  PARAM_LABEL,
  PARAM_UNIT,
  type ConditioningItem,
  type ConditioningKind,
  type ConditioningParam,
} from "@/features/routine/conditioning-catalog";
import { ExerciseSearchSelect } from "@/features/routine/components/exercise-search-select";
import type { CompletionStatus } from "@/features/routine/exercise-completions";
import { dropIndex } from "@/features/routine/plan-order";
import { useCoalescedRefresh } from "@/features/routine/use-coalesced-refresh";

export type TodayConditioningItem = {
  rowId: string;
  itemId: string;
  name: string;
  detail: string;
  kcal: number;
  durationMin: number | null;
  speed: number | null;
  incline: number | null;
  sets: number | null;
  reps: number | null;
  /** 개인 메모. null = 없음. */
  memo: string | null;
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
  lockWeightReps = false,
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
  /** 시간·속도·경사 고정. false 면 메인 표시에서 숨김(운동모드에서 설정·기록). */
  lockWeightReps?: boolean;
}) {
  const edit = useTodayEdit();
  const editMode = edit.editMode;
  const orderScope = useTodayOrder();
  const router = useRouter();
  const coalescedRefresh = useCoalescedRefresh();
  const [order, setOrder] = useState(items);
  const [done, setDone] = useState<Set<string>>(new Set(doneIds));
  const [skipped, setSkipped] = useState<Set<string>>(new Set(skippedIds));
  // 인라인 수정 중인 row id (편집 모드 + 연필 버튼 클릭 시)
  const [editingId, setEditingId] = useState<string | null>(null);
  // 메모 다이얼로그 대상 (메인 메모 버튼 클릭 시)
  const [memoTarget, setMemoTarget] = useState<TodayConditioningItem | null>(
    null,
  );
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
  const rowRefs = useRef<(HTMLLIElement | null)[]>([]);
  const [centers, setCenters] = useState<number[]>([]);
  const [dragShift, setDragShift] = useState(ROW_HEIGHT_PX);

  /** 드래그 시작 시 각 행 중심 y와 잡은 행 높이 캡처 — 가변 높이 정확 계산. */
  function captureCenters(source: number) {
    const next: number[] = [];
    let shift = ROW_HEIGHT_PX;
    for (let i = 0; i < order.length; i++) {
      const el = rowRefs.current[i];
      if (el) {
        const r = el.getBoundingClientRect();
        next[i] = r.top + r.height / 2;
        if (i === source) shift = r.height || ROW_HEIGHT_PX;
      } else {
        next[i] = i * ROW_HEIGHT_PX;
      }
    }
    setCenters(next);
    setDragShift(shift);
  }

  const newIndex =
    drag === null
      ? null
      : centers.length === order.length
        ? dropIndex(centers, drag.index, drag.dy)
        : Math.max(
            0,
            Math.min(
              order.length - 1,
              drag.index + Math.round(drag.dy / ROW_HEIGHT_PX),
            ),
          );
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
    // '운동 시작' 큐가 즉시 반영하도록 공유 오버라이드에 기록(서버 새로고침 대기 X).
    orderScope?.setCompletion(rowId, target === "clear" ? "active" : target);
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
              sets: item.sets,
              reps: item.reps,
            },
      );
      // 행 표시는 로컬 state 로 즉시 갱신. 상단 칼로리 카드만 마지막 토글 뒤 한 번
      // 새로고침(연타 시 전체 재렌더 폭주 방지).
      coalescedRefresh();
    });
  }

  function persistOrder(next: TodayConditioningItem[]) {
    // 가이드 큐(WorkoutSessionTimer)의 워밍업/마무리도 같은 순서로 시작하도록 공유
    // 컨텍스트에 새 순서를 올린다(즉시 반영). 로컬 order 도 이미 갱신돼 화면은 바로 바뀐다.
    orderScope?.setOrder(kind, next.map((i) => i.rowId));
    startTx(async () => {
      await reorderConditioningAction({
        source,
        kind,
        focus,
        dateYmd,
        ids: next.map((i) => i.rowId),
      });
      // 안전망: 서버 재렌더로 queueItems(서버 계산 순서)도 새 순서로 동기화.
      router.refresh();
    });
  }

  function onGripPointerDown(e: PointerEvent<HTMLSpanElement>, index: number) {
    e.stopPropagation();
    if (e.pointerType === "mouse" && e.button !== 0) return;
    dragStartYRef.current = e.clientY;
    captureCenters(index);
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
    // 순서 변경은 '편집하기' 모드에서만 — 평소엔 스와이프(완료/휴식)·탭(상세)만.
    if (editMode) {
      longPressTimerRef.current = setTimeout(() => {
        longPressTimerRef.current = null;
        setSwipe(null);
        dxRef.current = 0;
        lockedRef.current = "none";
        dragStartYRef.current = startRef.current.y;
        captureCenters(index);
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
      let capped = Math.max(-SWIPE_VISUAL_CAP, Math.min(SWIPE_VISUAL_CAP, dx));
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
    const wasLocked = lockedRef.current;
    setSwipe(null);
    dxRef.current = 0;
    lockedRef.current = "none";
    const isDone = done.has(rowId);
    const isSkipped = skipped.has(rowId);
    if (dx > SWIPE_THRESHOLD && !isSkipped) {
      setStatus(rowId, itemId, isDone ? "clear" : "done");
    } else if (dx < -SWIPE_THRESHOLD && !isDone) {
      setStatus(rowId, itemId, isSkipped ? "clear" : "skipped");
    } else if (
      wasLocked === "none" &&
      Math.abs(dx) < 8 &&
      !justDraggedRef.current &&
      !editMode
    ) {
      router.push(`/conditioning/${itemId}`);
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
      ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400"
      : "bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-400";

  return (
    <>
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
          if (drag.index < index && index <= newIndex) liftOtherY = -dragShift;
          else if (drag.index > index && index >= newIndex)
            liftOtherY = dragShift;
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

        const inlineEditing = editMode && editingId === item.rowId;

        return (
          <li
            key={item.rowId}
            ref={(el) => {
              rowRefs.current[index] = el;
            }}
            className="relative overflow-hidden rounded-xl"
            style={liftStyle}
          >
            {/* reveal 패널은 이 행을 실제로 스와이프하는 동안에만 렌더 — 완료/휴식
                행의 반투명 배경 뒤로 "완료"/"취소" 가 비쳐 보이는 것 방지. */}
            {swipe?.id !== item.rowId || isDragging || inlineEditing ? null : (
              <>
                <div
                  className={`pointer-events-none absolute inset-y-0 left-0 flex w-1/2 items-center pl-5 text-sm font-bold transition-colors ${
                    passedRight
                      ? "bg-emerald-600 text-white"
                      : "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400"
                  }`}
                >
                  <Check aria-hidden="true" size={18} />
                  <span className="ml-2">{isDone ? "취소" : "완료"}</span>
                </div>
                <div
                  className={`pointer-events-none absolute inset-y-0 right-0 flex w-1/2 items-center justify-end pr-5 text-sm font-bold transition-colors ${
                    passedLeft
                      ? "bg-zinc-600 text-white"
                      : "bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  <span className="mr-2">{isSkipped ? "취소" : "휴식"}</span>
                  <X aria-hidden="true" size={18} />
                </div>
              </>
            )}

            <div
              onPointerDown={
                inlineEditing ? undefined : (e) => onPointerDown(e, item.rowId)
              }
              onPointerMove={inlineEditing ? undefined : onPointerMove}
              onPointerUp={
                inlineEditing
                  ? undefined
                  : (e) => onPointerUp(e, item.rowId, item.itemId)
              }
              onPointerCancel={inlineEditing ? undefined : onPointerCancel}
              onContextMenu={(e) => e.preventDefault()}
              style={{
                transform: inlineEditing ? "none" : `translateX(${dx}px)`,
                transition: isSwiping ? "none" : "transform 220ms ease-out",
                touchAction: inlineEditing ? "auto" : "pan-y",
                WebkitTouchCallout: "none",
                WebkitUserSelect: inlineEditing ? "auto" : "none",
                userSelect: inlineEditing ? "auto" : "none",
              }}
              className={`relative flex select-none items-center gap-3 border bg-white dark:bg-zinc-800 p-4 shadow-sm ${
                isDragging
                  ? "border-emerald-500 ring-2 ring-emerald-300/70"
                  : inlineEditing
                    ? "border-emerald-400 ring-1 ring-emerald-200"
                    : isDone
                      ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950"
                      : isSkipped
                        ? "border-zinc-300 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-900"
                        : "border-zinc-200 dark:border-zinc-700"
              }`}
            >
              {!editMode || inlineEditing ? null : (
                <span
                  onPointerDown={(e) => onGripPointerDown(e, index)}
                  onPointerMove={onGripPointerMove}
                  onPointerUp={onGripPointerUp}
                  onPointerCancel={onGripPointerUp}
                  aria-hidden="true"
                  className={`flex h-10 w-8 shrink-0 cursor-grab items-center justify-center transition-colors ${
                    isDragging
                      ? "text-emerald-600"
                      : "text-zinc-400 dark:text-zinc-500"
                  }active:cursor-grabbing`}
                  style={{ touchAction: "none" }}
                  title="잡고 위·아래로 순서 변경"
                >
                  <GripVertical size={20} />
                </span>
              )}

              {editMode && !inlineEditing ? (
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

              {inlineEditing ? null : (
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBg}`}
                >
                  <ConditioningIcon id={item.itemId} size={22} />
                </span>
              )}
              {inlineEditing ? (
                <ConditioningEditForm
                  item={item}
                  onCancel={() => setEditingId(null)}
                  onSaved={(next) => {
                    setOrder((prev) =>
                      prev.map((p) =>
                        p.rowId === item.rowId ? { ...p, ...next } : p,
                      ),
                    );
                    setEditingId(null);
                    // router.refresh() 생략 — 로컬에 새 detail/kcal 반영.
                  }}
                />
              ) : (
                <div className="group flex min-w-0 flex-1 items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-base font-bold text-zinc-950 dark:text-zinc-100">
                      {item.name}
                      {isDone ? (
                        <span className="ml-2 whitespace-nowrap rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                          완료
                        </span>
                      ) : null}
                      {isSkipped ? (
                        <span className="ml-2 whitespace-nowrap rounded-full bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 text-[10px] font-bold text-zinc-700 dark:text-zinc-300">
                          오늘 휴식
                        </span>
                      ) : null}
                    </h4>
                    <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
                      {lockWeightReps ? <>{item.detail} · </> : null}
                      <span className="text-xs text-orange-700 dark:text-orange-400">
                        약 {item.kcal}kcal
                      </span>
                    </p>
                    {item.memo ? (
                      <p className="mt-1 flex items-start gap-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                        <StickyNote
                          aria-hidden="true"
                          size={12}
                          className="mt-0.5 shrink-0 text-amber-500"
                        />
                        <span className="whitespace-pre-wrap">{item.memo}</span>
                      </p>
                    ) : null}
                  </div>
                  {editMode && lockWeightReps ? (
                    <button
                      type="button"
                      aria-label="수정"
                      title="수정"
                      onPointerDown={(e) => e.stopPropagation()}
                      onPointerMove={(e) => e.stopPropagation()}
                      onPointerUp={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(item.rowId);
                      }}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-emerald-700 dark:text-emerald-400 transition hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                    >
                      <Pencil aria-hidden="true" size={16} />
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        aria-label={item.memo ? "메모 수정" : "메모 추가"}
                        title={item.memo ? "메모 수정" : "메모 추가"}
                        onPointerDown={(e) => e.stopPropagation()}
                        onPointerMove={(e) => e.stopPropagation()}
                        onPointerUp={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          setMemoTarget(item);
                        }}
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition ${
                          item.memo
                            ? "text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                            : "text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                        }`}
                      >
                        <StickyNote aria-hidden="true" size={16} />
                      </button>
                      <ChevronRight
                        aria-hidden="true"
                        className="shrink-0 text-zinc-400 dark:text-zinc-500 transition group-hover:translate-x-0.5 group-hover:text-emerald-700"
                        size={18}
                      />
                    </>
                  )}
                </div>
              )}
            </div>
          </li>
        );
      })}
      {editMode && focus ? (
        <li className="relative">
          <AddConditioningSlot
            kind={kind}
            focus={focus}
            onAdded={() => startTx(() => router.refresh())}
          />
        </li>
      ) : null}
    </ul>
    {memoTarget ? (
      <CondMemoDialog
        item={memoTarget}
        onClose={() => setMemoTarget(null)}
        onSaved={(memo) => {
          setOrder((prev) =>
            prev.map((p) =>
              p.rowId === memoTarget.rowId ? { ...p, memo } : p,
            ),
          );
          setMemoTarget(null);
          // 운동모드 큐(queueItems)도 다시 그려 메모가 워밍업/마무리에도 반영되게.
          router.refresh();
        }}
      />
    ) : null}
    </>
  );
}

/** 워밍업/마무리 메모 편집 다이얼로그 (메인 메모 버튼). */
function CondMemoDialog({
  item,
  onClose,
  onSaved,
}: {
  item: TodayConditioningItem;
  onClose: () => void;
  onSaved: (memo: string | null) => void;
}) {
  const [memo, setMemo] = useState<string>(item.memo ?? "");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save() {
    const value = memo.trim() === "" ? null : memo.trim();
    start(async () => {
      const res = await updateConditioningMemoAction(item.rowId, value);
      if (res.ok) onSaved(value);
      else setError(res.error);
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:items-center sm:pb-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-800 p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center gap-2">
          <StickyNote aria-hidden="true" className="text-amber-500" size={18} />
          <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-100">
            {item.name} 메모
          </h3>
        </div>
        <textarea
          aria-label="메모"
          value={memo}
          maxLength={1000}
          rows={4}
          autoFocus
          placeholder="예: 발목 가볍게 풀고, 호흡 일정하게"
          onChange={(e) => {
            setMemo(e.target.value);
            setError(null);
          }}
          disabled={pending}
          className="w-full resize-y rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400"
        />
        {error ? (
          <p className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="inline-flex h-10 items-center rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300 transition hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-60"
          >
            취소
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="inline-flex h-10 items-center gap-1.5 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
          >
            {pending ? (
              <Loader2 aria-hidden="true" className="animate-spin" size={15} />
            ) : (
              <Check aria-hidden="true" size={15} />
            )}
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

/** 워밍업/마무리 1행의 파라미터(시간/속도/경사 또는 세트/횟수) 인라인 수정 폼. */
function ConditioningEditForm({
  item,
  onCancel,
  onSaved,
}: {
  item: TodayConditioningItem;
  onCancel: () => void;
  onSaved: (next: {
    durationMin: number | null;
    speed: number | null;
    incline: number | null;
    sets: number | null;
    reps: number | null;
    detail: string;
  }) => void;
}) {
  const catalog = getConditioningItem(item.itemId);
  const params = catalog?.params ?? [];
  const str = (n: number | null) => (n === null ? "" : String(n));
  const [vals, setVals] = useState<Record<ConditioningParam, string>>({
    duration: str(item.durationMin),
    speed: str(item.speed),
    incline: str(item.incline),
    sets: str(item.sets),
    reps: str(item.reps),
  });
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function parse(s: string): number | null {
    if (s.trim() === "") return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }
  const MAX: Record<ConditioningParam, number> = {
    duration: 600,
    speed: 200,
    incline: 100,
    sets: 20,
    reps: 100,
  };

  function save() {
    const get = (p: ConditioningParam) =>
      params.includes(p) ? parse(vals[p]) : null;
    const next = {
      durationMin: get("duration"),
      speed: get("speed"),
      incline: get("incline"),
      sets: get("sets"),
      reps: get("reps"),
    };
    const okRange = params.every((p) => {
      const v = get(p);
      return v === null || (Number.isFinite(v) && v >= 0 && v <= MAX[p]);
    });
    if (!okRange) {
      setError("값 범위를 확인해 주세요.");
      return;
    }
    start(async () => {
      const res = await updateConditioningRowAction(item.rowId, next);
      if (res.ok) {
        setError(null);
        onSaved({ ...next, detail: buildDetail(catalog, next) });
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <div className="text-sm font-bold text-zinc-950 dark:text-zinc-100">
        {item.name}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {params.map((p) => (
          <span key={p} className="flex items-center gap-1">
            <input
              aria-label={PARAM_LABEL[p]}
              type="number"
              inputMode="decimal"
              value={vals[p]}
              onChange={(e) => {
                setVals((v) => ({ ...v, [p]: e.target.value }));
                setError(null);
              }}
              disabled={pending}
              className="h-9 w-16 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 text-center text-sm"
            />
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {PARAM_UNIT[p]}
            </span>
          </span>
        ))}
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="inline-flex h-9 items-center gap-1 whitespace-nowrap rounded-md bg-emerald-600 px-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
        >
          {pending ? (
            <Loader2 aria-hidden="true" className="animate-spin" size={14} />
          ) : (
            <Check aria-hidden="true" size={14} />
          )}
          저장
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="inline-flex h-9 items-center gap-1 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300 transition hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-60"
        >
          취소
        </button>
      </div>
      {error ? (
        <p className="text-xs font-semibold text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function buildDetail(
  item: ConditioningItem | undefined,
  v: {
    durationMin: number | null;
    speed: number | null;
    incline: number | null;
    sets: number | null;
    reps: number | null;
  },
): string {
  const params = item?.params ?? [];
  const valOf = (p: ConditioningParam): number | null =>
    p === "duration"
      ? v.durationMin
      : p === "speed"
        ? v.speed
        : p === "incline"
          ? v.incline
          : p === "sets"
            ? v.sets
            : v.reps;
  const parts: string[] = [];
  for (const p of params) {
    const x = valOf(p);
    if (x !== null) parts.push(`${x}${PARAM_UNIT[p]}`);
  }
  return parts.join(" · ") || "—";
}

/** 편집 모드 하단의"워밍업/마무리에 추가" 점선 박스. 종목 선택 → 즉시 추가. */
function AddConditioningSlot({
  kind,
  focus,
  onAdded,
}: {
  kind: ConditioningKind;
  focus: string;
  onAdded: () => void;
}) {
  const options = conditioningOptions(kind);
  const [open, setOpen] = useState(false);
  const [itemId, setItemId] = useState<string>(options[0]?.id ?? "");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!itemId) return;
    start(async () => {
      const res = await addConditioningToTodayAction(focus, kind, itemId);
      if (res.ok) {
        setOpen(false);
        setError(null);
        onAdded();
      } else {
        setError(res.error);
      }
    });
  }

  const label = kind === "warmup" ? "워밍업" : "마무리";

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-4 py-4 text-sm font-semibold text-zinc-600 dark:text-zinc-400 transition hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-700 dark:hover:text-emerald-400"
      >
        <Plus aria-hidden="true" size={16} />
        {label} 항목 추가
      </button>
    );
  }

  return (
    <div className="rounded-xl border-2 border-dashed border-emerald-400 bg-emerald-50/40 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <ExerciseSearchSelect
          ariaLabel="항목"
          options={options}
          value={itemId}
          disabled={pending || options.length === 0}
          onChange={(id) => {
            setItemId(id);
            setError(null);
          }}
        />
        <button
          type="button"
          onClick={submit}
          disabled={pending || !itemId}
          className="inline-flex h-9 items-center gap-1 whitespace-nowrap rounded-md bg-emerald-600 px-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
        >
          {pending ? (
            <Loader2 aria-hidden="true" className="animate-spin" size={14} />
          ) : (
            <Plus aria-hidden="true" size={14} />
          )}
          추가
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          disabled={pending}
          className="inline-flex h-9 items-center gap-1 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300 transition hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-60"
        >
          취소
        </button>
      </div>
      <p className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
        시간·속도·경사는 카탈로그 기본값으로 자동 설정됩니다. 추가 후 수정에서
        조절하세요.
      </p>
      {error ? (
        <p className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
