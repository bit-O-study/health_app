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
  addExerciseToTodayAction,
  reorderPlanAction,
  updateExerciseAction,
  updateExerciseMemoAction,
} from "@/features/routine/plan-actions";
import { estimateStrengthKcal } from "@/features/routine/calories";
import { setExerciseStatusAction } from "@/features/routine/exercise-completion-actions";
import { addWorkoutDurationAction } from "@/features/workout-timer/workout-session-actions";
import {
  readTimer,
  takeUnsavedDelta,
} from "@/features/workout-timer/timer-store";
import { useTodayEdit } from "@/features/routine/components/today-edit-scope";
import { useTodayOrder } from "@/features/routine/components/today-order-scope";
import { useRestTimer } from "@/features/workout-timer/rest-timer";
import { useCoalescedRefresh } from "@/features/routine/use-coalesced-refresh";
import { ExerciseIcon } from "@/features/exercises/components/exercise-icon";
import { DAY_BLOCKS, type FocusTone } from "@/features/routine/data";
import {
  allExercisesForFocus,
  EQUIPMENT_LABELS,
  getCatalogExercise,
  majorMuscleTag,
  type EquipmentId,
  type FocusKey,
} from "@/features/routine/exercise-catalog";
import { ExerciseSearchSelect } from "@/features/routine/components/exercise-search-select";
import {
  summarizeSetDetails,
  type SetDetail,
} from "@/features/routine/set-details";
import { dropIndex } from "@/features/routine/plan-order";
import { subMusclesForExercise } from "@/features/routine/muscle-detail";
import { muscleGroup } from "@/features/routine/muscle-map";

/** 행 높이를 못 잰 경우의 폴백 평균 높이 (px) */
const ROW_HEIGHT_PX = 80;

export type TodayPlanItem = {
  id: string;
  exerciseId: string;
  equipment: string;
  name: string;
  equipmentLabel: string;
  sets: number;
  reps: number;
  weightKg: number | null;
  /** 세트별 무게·횟수. null = 균일(sets×reps@weightKg). */
  setDetails: SetDetail[] | null;
  focus: string;
  /** 개인 메모. null = 없음. */
  memo: string | null;
};

const SWIPE_THRESHOLD = 80; // px — 넘으면 토글
const SWIPE_VISUAL_CAP = 120; // 시각적 최대 이동

/** 길게 누른 시간 (ms) — 이만큼 누르면 행 본체에서도 드래그 모드로 진입 */
const LONG_PRESS_MS = 280;
/** 길게 누르는 동안 이만큼 움직이면 long-press 취소 — 스크롤/스와이프로 인식 */
const LONG_PRESS_MOVE_TOLERANCE = 6;

export function TodayPlanList({
  focus,
  tones,
  dayIndex,
  items,
  weightKg,
  doneIds,
  skippedIds,
  lockWeightReps = false,
}: {
  focus: string;
  /** 오늘의 모든 부위 — 편집 모드에서 운동 추가 시 부위 선택지로 사용 */
  tones: FocusKey[];
  /** 오늘의 주기 일차 — 운동 추가 시 그 일차에 저장 */
  dayIndex: number;
  items: TodayPlanItem[];
  weightKg: number | null;
  doneIds: string[];
  skippedIds: string[];
  /** 무게·횟수 고정. false 면 메인 표시·편집에서 무게/횟수 숨김(운동모드에서 설정). */
  lockWeightReps?: boolean;
}) {
  const edit = useTodayEdit();
  const editMode = edit.editMode;
  const orderScope = useTodayOrder();
  const router = useRouter();
  // 완료 토글이 연달아 일어나도 서버 재렌더는 한 번으로 합친다(칼로리 카드만 갱신).
  const coalescedRefresh = useCoalescedRefresh();
  const rest = useRestTimer();
  const [order, setOrder] = useState(items);
  const [done, setDone] = useState<Set<string>>(new Set(doneIds));
  const [skipped, setSkipped] = useState<Set<string>>(new Set(skippedIds));

  // 포인터 기반 드래그 (그립 핸들에서 시작 — 마우스/터치 공통).
  // index: 잡힌 원래 위치, dy: 시작점에서 현재까지의 수직 이동(px),
  // pointerId: setPointerCapture 한 포인터 식별자
  const [drag, setDrag] = useState<{
    index: number;
    dy: number;
    pointerId: number;
  } | null>(null);
  const dragStartYRef = useRef(0);
  const dragIndex = drag?.index ?? null;
  // 각 행 DOM(높이 측정용) + 드래그 시작 시 캡처한 중심 y / 잡은 행 높이(state — 렌더에서 읽음)
  const rowRefs = useRef<(HTMLLIElement | null)[]>([]);
  const [centers, setCenters] = useState<number[]>([]);
  const [dragShift, setDragShift] = useState(ROW_HEIGHT_PX);

  /** 드래그 시작 시 각 행의 중심 y(화면좌표)와 잡은 행 높이를 캡처 — 가변 높이 정확 계산. */
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
        next[i] = i * ROW_HEIGHT_PX; // 폴백
      }
    }
    setCenters(next);
    setDragShift(shift);
  }

  // 현재 dy 기준 새 위치 (가변 행 높이를 고려한 기하 계산; 캡처 실패 시 폴백)
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

  // 인라인 수정 중인 row id (편집 모드 + 연필 버튼 클릭 시) — 한 번에 1개만
  const [editingId, setEditingId] = useState<string | null>(null);
  // 메모 다이얼로그 대상 (메인 메모 버튼 클릭 시)
  const [memoTarget, setMemoTarget] = useState<TodayPlanItem | null>(null);

  // 스와이프 상태 — onPointerUp 에서 정확한 dx 를 읽도록 ref + state 병행
  const [swipe, setSwipe] = useState<{ id: string; dx: number } | null>(null);
  const startRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dxRef = useRef(0);
  const lockedRef = useRef<"none" | "horizontal" | "vertical">("none");
  // 행 본체에서 long-press 타이머. 시간이 지나면 드래그 모드로 진입.
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 드래그 직후 자동으로 발생할 수 있는 click 이 Link 로 흘러가지 않게 차단하는 플래그
  const justDraggedRef = useRef(false);

  function clearLongPress() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  const [, startTx] = useTransition();
  const w = weightKg ?? 65;

  function persistOrder(next: TodayPlanItem[]) {
    // 1) 즉시 반영: 가이드 큐(WorkoutSessionTimer)가 같은 순서로 시작하도록 공유
    //    컨텍스트에 새 순서를 올린다. 로컬 order 도 이미 갱신돼 화면은 바로 바뀐다.
    orderScope?.setOrder("main", next.map((i) => i.id));
    // 2) 확실한 동기화(안전망): DB 저장 후 router.refresh() 로 서버를 다시 그려
    //    가이드 큐의 queueItems(서버 계산값)도 새 순서로 맞춘다. 컨텍스트가 어떤
    //    이유로 전달되지 않아도 운동 시작 순서가 항상 바뀐 순서를 따르게 한다.
    //    (로컬 state 로 화면은 이미 즉시 갱신됐으므로 체감 지연은 없다.)
    startTx(async () => {
      await reorderPlanAction(
        focus,
        next.map((i) => i.id),
      );
      router.refresh();
    });
  }

  function setStatus(id: string, target: "done" | "skipped" | "clear") {
    const item = order.find((o) => o.id === id);
    const wasDone = done.has(id);
    const nextDone = new Set(done);
    const nextSkipped = new Set(skipped);
    nextDone.delete(id);
    nextSkipped.delete(id);
    if (target === "done") nextDone.add(id);
    else if (target === "skipped") nextSkipped.add(id);
    setDone(nextDone);
    setSkipped(nextSkipped);
    // '운동 시작' 큐가 즉시 반영하도록 공유 오버라이드에 기록(서버 새로고침 대기 X).
    orderScope?.setCompletion(id, target === "clear" ? "active" : target);
    // 새로 완료 처리한 운동(취소 아님)에 한해 휴식 타이머 자동 시작.
    // 강도 추정: 무게 있으면 90초, 맨몸이면 60초.
    if (target === "done" && !wasDone && item) {
      const restSec = item.weightKg !== null && item.weightKg > 0 ? 90 : 60;
      rest.trigger(restSec);
    }
    // 운동 1개 완료마다 그날 누적 운동시간 갱신 — 타이머가 돌고 있을 때만,
    // 아직 DB 에 안 올린 만큼(delta)만 더해 캘린더에 반영(이중 가산 방지).
    if (target === "done" && !wasDone) {
      const d = takeUnsavedDelta(readTimer());
      if (d) void addWorkoutDurationAction(d.forDate, d.deltaSec);
    }
    startTx(async () => {
      await setExerciseStatusAction(
        id,
        target,
        // clear 에도 스냅샷을 넘긴다 — 액션이 (부위:운동) 폴백 기록까지 지워야
        // 루틴 변경으로 행 id 가 바뀐 완료도 정상 취소된다.
        !item
          ? undefined
          : {
              exerciseId: item.exerciseId,
              equipment: item.equipment,
              sets: item.sets,
              reps: item.reps,
              weightKg: item.weightKg,
              setDetails: item.setDetails,
              focus: item.focus,
            },
      );
      // 행 색·뱃지는 로컬 done/skipped Set 으로 이미 즉시 반영됨. 상단 "완료 kcal" 카드
      // (서버 계산값)만 마지막 토글 뒤 한 번 새로고침(연타 시 전체 재렌더 폭주 방지).
      coalescedRefresh();
    });
  }

  /* ── 포인터 기반 드래그 (그립 핸들에서 시작) ─
   * 마우스·터치 통합. 행이 손가락 따라 들려서 움직이고, 다른 행은 자리를 비켜준다.
   * 네이티브 HTML5 drag 대비 모바일 체감이 훨씬 좋음. */
  function onGripPointerDown(e: PointerEvent<HTMLSpanElement>, index: number) {
    // 행 본체의 스와이프 핸들러까지 전달되지 않게 차단
    e.stopPropagation();
    if (e.pointerType === "mouse" && e.button !== 0) return;
    dragStartYRef.current = e.clientY;
    captureCenters(index);
    setDrag({ index, dy: 0, pointerId: e.pointerId });
    e.currentTarget.setPointerCapture(e.pointerId);
    // 햅틱 (지원 기기만 — 무시되더라도 안전)
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
    const target = newIndex; // useState 의 최신 값과 동기화
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

  /* ── 행 본체 포인터 핸들러 ─────────────────────────────────────────
   * 3 가지 동작을 하나의 포인터 시퀀스로 분기:
   * 1) 꾹 누름(>=350ms, 거의 안 움직임) → 드래그 모드 진입, 위·아래로 순서 변경
   * 2) 가로 스와이프 → 완료/휴식 토글
   * 3) 짧은 탭 → Link 클릭 → 운동 상세로 이동
   */
  function onPointerDown(e: PointerEvent<HTMLDivElement>, id: string) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    startRef.current = { x: e.clientX, y: e.clientY };
    dxRef.current = 0;
    lockedRef.current = "none";
    setSwipe({ id, dx: 0 });
    e.currentTarget.setPointerCapture(e.pointerId);
    // long-press 타이머 시작 — 약간만 움직여도 onPointerMove 에서 취소됨
    clearLongPress();
    const pointerId = e.pointerId;
    const index = order.findIndex((o) => o.id === id);
    if (index < 0) return;
    // 순서 변경은 '편집하기' 모드에서만 — 평소엔 스와이프(완료/휴식)·탭(상세)만.
    if (editMode) {
      longPressTimerRef.current = setTimeout(() => {
        longPressTimerRef.current = null;
        // 드래그 모드 진입 — 진행 중이던 스와이프 상태는 모두 무효화
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
    // 1) 드래그 모드면 행을 손가락에 붙여 이동
    if (drag && e.pointerId === drag.pointerId) {
      e.preventDefault();
      const dy = e.clientY - startRef.current.y;
      setDrag((prev) => (prev ? { ...prev, dy } : null));
      return;
    }
    // 2) long-press 대기 중인데 충분히 움직였으면 long-press 취소
    if (longPressTimerRef.current) {
      const md = Math.hypot(
        e.clientX - startRef.current.x,
        e.clientY - startRef.current.y,
      );
      if (md > LONG_PRESS_MOVE_TOLERANCE) clearLongPress();
    }
    // 3) 평소대로 스와이프 처리
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
      // 완료 → 휴식 / 휴식 → 완료 직접 전환 차단 (먼저 취소 후 재시도)
      if (done.has(swipe.id)) capped = Math.max(0, capped);
      if (skipped.has(swipe.id)) capped = Math.min(0, capped);
      dxRef.current = capped;
      setSwipe((p) => (p ? { ...p, dx: capped } : null));
    }
  }
  function onPointerUp(e: PointerEvent<HTMLDivElement>, id: string) {
    clearLongPress();
    // 드래그 모드였으면 reorder 처리 + 직후 click 차단
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
      // 손 떼자마자 발생할 수 있는 click(Link 이동) 차단
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
    const isDone = done.has(id);
    const isSkipped = skipped.has(id);
    if (dx > SWIPE_THRESHOLD && !isSkipped) {
      setStatus(id, isDone ? "clear" : "done");
    } else if (dx < -SWIPE_THRESHOLD && !isDone) {
      setStatus(id, isSkipped ? "clear" : "skipped");
    } else if (
      wasLocked === "none" &&
      Math.abs(dx) < 8 &&
      !justDraggedRef.current &&
      !editMode
    ) {
      // 깨끗한 탭 → 운동 상세로 (편집 모드일 땐 체크박스 토글이 의도이므로 이동 안 함)
      const item = order.find((o) => o.id === id);
      if (item) {
        router.push(`/exercises/${item.exerciseId}?eq=${item.equipment}`);
      }
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

  return (
    <>
    <ul className="space-y-2">
      {order.map((item, index) => {
        const isDone = done.has(item.id);
        const isSkipped = skipped.has(item.id);
        const kcal = Math.round(
          estimateStrengthKcal(w, item.exerciseId, item.sets),
        );
        const dx = swipe?.id === item.id ? swipe.dx : 0;
        const isSwiping = swipe?.id === item.id && Math.abs(dx) > 4;
        const passedRight = dx > SWIPE_THRESHOLD;
        const passedLeft = dx < -SWIPE_THRESHOLD;

        // 이 행이 드래그 중인지 / 잡힌 행이 다른 행 자리에 들어와 비켜줘야 하는지
        const isDragging = dragIndex === index;
        // 다른 행이 자리를 비켜줄 거리 (드래그 행이 위 아래로 이동했을 때)
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

        const inlineEditing = editMode && editingId === item.id;

        return (
          <li
            key={item.id}
            ref={(el) => {
              rowRefs.current[index] = el;
            }}
            className="relative overflow-hidden rounded-xl"
            style={liftStyle}
          >
            {/* reveal 패널은 이 행을 실제로 스와이프하는 동안에만 렌더.
                항상 렌더하면 완료(emerald-950/40)·휴식(zinc-800/60) 행의 반투명
                배경 뒤로 "완료"/"취소" 글씨가 비쳐 보인다. */}
            {swipe?.id !== item.id || isDragging || inlineEditing ? null : (
              <>
                {/* 왼쪽: 오른쪽으로 끌면 노출되는"완료" 영역 */}
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
                {/* 오른쪽: 왼쪽으로 끌면 노출되는"휴식" 영역 */}
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

            {/* 전경 행 — 좌/우 스와이프 + 꾹 누름으로 순서 변경 + 짧은 탭으로 상세 이동.
 인라인 수정 중에는 드래그/스와이프 비활성화. */}
            <div
              onPointerDown={
                inlineEditing ? undefined : (e) => onPointerDown(e, item.id)
              }
              onPointerMove={inlineEditing ? undefined : onPointerMove}
              onPointerUp={
                inlineEditing ? undefined : (e) => onPointerUp(e, item.id)
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
              className={`relative flex select-none items-center gap-2 border bg-white dark:bg-zinc-800 p-4 shadow-sm ${
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
                  className={`flex h-10 w-8 shrink-0 cursor-grab touch-none items-center justify-center transition-colors ${
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
                  checked={edit.selectedMain.has(item.id)}
                  onPointerDown={(e) => e.stopPropagation()}
                  onPointerMove={(e) => e.stopPropagation()}
                  onPointerUp={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => edit.toggleMain(item.id)}
                  className="h-5 w-5 shrink-0 accent-red-600"
                />
              ) : null}

              {inlineEditing ? null : (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400">
                  <ExerciseIcon id={item.exerciseId} size={22} />
                </span>
              )}

              {inlineEditing ? (
                <ExerciseEditForm
                  item={item}
                  lockWeightReps={lockWeightReps}
                  onCancel={() => setEditingId(null)}
                  onSaved={(next) => {
                    setOrder((prev) =>
                      prev.map((p) =>
                        p.id === item.id ? { ...p, ...next } : p,
                      ),
                    );
                    setEditingId(null);
                    // 카드(로컬 order)는 즉시 반영되지만, 운동모드 큐(queueItems)는
                    // 서버 렌더값이라 router.refresh() 로 다시 그려야 세트수 변경
                    // (예: 4→6세트)이 운동모드에도 반영된다. (persistOrder 와 동일한 안전망)
                    router.refresh();
                  }}
                />
              ) : (
                /* Link 대신 div — anchor 네이티브 드래그/콘텍스트 메뉴가
 long-press 인식을 가로채는 걸 막기 위함. 탭이 끝나면
 onPointerUp 에서 router.push 로 직접 이동. */
                <div className="group flex min-w-0 flex-1 items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-100">
                      {item.name}
                      {/* 대근육 부위 1개 + 세부근육 1개 — 가장 영향 큰 것만 */}
                      {(() => {
                        const major = majorMuscleTag(item.exerciseId);
                        return (
                          <span
                            className={`ml-1 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-bold ${major.tone}`}
                          >
                            {major.label}
                          </span>
                        );
                      })()}
                      {(() => {
                        const sub = subMusclesForExercise(item.exerciseId)[0];
                        if (!sub) return null;
                        return (
                          <span
                            className="ml-1 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white"
                            style={{
                              backgroundColor: muscleGroup(sub.muscle).color,
                            }}
                          >
                            {sub.label}
                          </span>
                        );
                      })()}
                      <span className="ml-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        {item.equipmentLabel}
                      </span>
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
                    </h3>
                    <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
                      {/* 무게·횟수 고정 켬일 때만 세트·횟수·무게 표시. 끔이면 운동모드에서
                          정하므로 메인엔 칼로리만(세트수도 안 보임). */}
                      {lockWeightReps
                        ? item.setDetails && item.setDetails.length > 0
                          ? `${item.setDetails.length}세트 · ${summarizeSetDetails(item.setDetails)}`
                          : `${item.sets}세트 × ${item.reps}회${
                              item.weightKg !== null
                                ? ` · ${item.weightKg}kg`
                                : " · 맨몸"
                            }`
                        : null}
                      <span className="text-xs text-orange-700 dark:text-orange-400">
                        {lockWeightReps ? " · " : ""}약 {kcal}kcal
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
                        setEditingId(item.id);
                      }}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-emerald-700 dark:text-emerald-400 transition hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                    >
                      <Pencil aria-hidden="true" size={16} />
                    </button>
                  ) : (
                    <>
                      {/* 메모 버튼 — 메인에서 바로 메모 작성/수정. 스와이프·탭 이동과
                          충돌하지 않도록 포인터 이벤트 전파 차단. */}
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
      {editMode ? (
        <li className="relative">
          <AddExerciseSlot
            tones={tones}
            dayIndex={dayIndex}
            onAdded={() => router.refresh()}
          />
        </li>
      ) : null}
    </ul>
    {memoTarget ? (
      <MemoDialog
        item={memoTarget}
        onClose={() => setMemoTarget(null)}
        onSaved={(memo) => {
          setOrder((prev) =>
            prev.map((p) => (p.id === memoTarget.id ? { ...p, memo } : p)),
          );
          setMemoTarget(null);
          // 서버 렌더값(운동모드 큐 queueItems)도 다시 그려야 운동모드에 메모가 반영된다.
          router.refresh();
        }}
      />
    ) : null}
    </>
  );
}

/** 메인 화면 메모 버튼 → 간단 메모 편집 다이얼로그. */
function MemoDialog({
  item,
  onClose,
  onSaved,
}: {
  item: TodayPlanItem;
  onClose: () => void;
  onSaved: (memo: string | null) => void;
}) {
  const [memo, setMemo] = useState<string>(item.memo ?? "");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save() {
    const value = memo.trim() === "" ? null : memo.trim();
    start(async () => {
      const res = await updateExerciseMemoAction(item.id, value);
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
          <StickyNote
            aria-hidden="true"
            className="text-amber-500"
            size={18}
          />
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
          placeholder="예: 어깨 내리고 견갑 고정, 마지막 세트 천천히"
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

/** 편집 모드에서 행 우측 연필 버튼 → 인라인 수정 폼.
 * 세트·횟수·무게 수정 + "세트별 다르게"(드롭세트·피라미드) 토글.
 * 운동·기구 변경은 삭제 후 다시 추가로 처리. */
function ExerciseEditForm({
  item,
  lockWeightReps = false,
  onCancel,
  onSaved,
}: {
  item: TodayPlanItem;
  /** 무게·횟수 고정 끔 → 세트 수만 수정(무게/횟수/세트별 숨김). */
  lockWeightReps?: boolean;
  onCancel: () => void;
  onSaved: (next: {
    sets: number;
    reps: number;
    weightKg: number | null;
    setDetails: SetDetail[] | null;
  }) => void;
}) {
  const [sets, setSets] = useState<string>(String(item.sets));
  const [reps, setReps] = useState<string>(String(item.reps));
  const [weight, setWeight] = useState<string>(
    item.weightKg === null ? "" : String(item.weightKg),
  );
  // 세트별 모드 on/off + 세트별 입력값(문자열 보관 → 빈칸=맨몸 허용). 고정 끔이면 항상 균일.
  const [perSet, setPerSet] = useState<boolean>(
    lockWeightReps && !!item.setDetails && item.setDetails.length > 0,
  );
  const [detailRows, setDetailRows] = useState<
    { weight: string; reps: string }[]
  >(() =>
    item.setDetails && item.setDetails.length > 0
      ? item.setDetails.map((s) => ({
          weight: s.weightKg === null ? "" : String(s.weightKg),
          reps: String(s.reps),
        }))
      : [{ weight: weight, reps: reps }],
  );
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // 균일 → 세트별 전환 시 현재 세트 수만큼 균일값으로 채워 시작
  function enablePerSet() {
    const s = Math.min(20, Math.max(1, Number(sets) || 1));
    setDetailRows(Array.from({ length: s }, () => ({ weight, reps })));
    setPerSet(true);
    setError(null);
  }
  function disablePerSet() {
    setPerSet(false);
    setError(null);
  }
  function addDetail() {
    setDetailRows((prev) => {
      const last = prev[prev.length - 1];
      return prev.length >= 20
        ? prev
        : [...prev, last ? { ...last } : { weight: "", reps: "10" }];
    });
    setError(null);
  }
  function removeDetail(i: number) {
    setDetailRows((prev) => prev.filter((_, idx) => idx !== i));
    setError(null);
  }
  function patchDetail(i: number, key: "weight" | "reps", val: string) {
    setDetailRows((prev) =>
      prev.map((row, idx) => (idx === i ? { ...row, [key]: val } : row)),
    );
    setError(null);
  }

  function save() {
    if (perSet) {
      if (detailRows.length < 1 || detailRows.length > 20) {
        setError("세트는 1~20개로 입력하세요.");
        return;
      }
      const parsed: SetDetail[] = [];
      for (const row of detailRows) {
        const r = Number(row.reps);
        if (!Number.isInteger(r) || r < 1 || r > 100) {
          setError("각 세트 횟수는 1~100 으로 입력하세요.");
          return;
        }
        const w = row.weight.trim() === "" ? null : Number(row.weight);
        if (w !== null && (!Number.isFinite(w) || w < 0 || w > 1000)) {
          setError("무게는 0~1000 사이로 입력하세요.");
          return;
        }
        parsed.push({ weightKg: w, reps: r });
      }
      start(async () => {
        const res = await updateExerciseAction(item.id, {
          sets: parsed.length,
          reps: parsed[0].reps,
          weightKg: parsed[0].weightKg,
          setDetails: parsed,
        });
        if (res.ok) {
          setError(null);
          onSaved({
            sets: parsed.length,
            reps: parsed[0].reps,
            weightKg: parsed[0].weightKg,
            setDetails: parsed,
          });
        } else {
          setError(res.error);
        }
      });
      return;
    }

    const s = Number(sets);
    const r = Number(reps);
    if (
      !Number.isInteger(s) ||
      s < 1 ||
      s > 20 ||
      !Number.isInteger(r) ||
      r < 1 ||
      r > 100
    ) {
      setError("세트는 1~20, 횟수는 1~100 으로 입력하세요.");
      return;
    }
    const w = weight.trim() === "" ? null : Number(weight);
    if (w !== null && (!Number.isFinite(w) || w < 0 || w > 1000)) {
      setError("무게는 0~1000 사이로 입력하세요.");
      return;
    }
    start(async () => {
      const res = await updateExerciseAction(item.id, {
        sets: s,
        reps: r,
        weightKg: w,
        setDetails: null,
      });
      if (res.ok) {
        setError(null);
        onSaved({ sets: s, reps: r, weightKg: w, setDetails: null });
      } else {
        setError(res.error);
      }
    });
  }

  const inputCls =
    "h-9 w-16 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 text-center text-sm";

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-bold text-zinc-950 dark:text-zinc-100">
          {item.name}
          <span className="ml-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {item.equipmentLabel}
          </span>
        </div>
        {lockWeightReps ? (
          <button
            type="button"
            onClick={perSet ? disablePerSet : enablePerSet}
            disabled={pending}
            className={`inline-flex h-7 items-center rounded-md border px-2 text-[11px] font-semibold transition ${
              perSet
                ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                : "border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
            }`}
          >
            세트별 다르게
          </button>
        ) : null}
      </div>

      {perSet ? (
        <div className="flex flex-col gap-1.5">
          {detailRows.map((row, i) => (
            <div key={i} className="flex flex-wrap items-center gap-1.5">
              <span className="w-9 shrink-0 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                {i + 1}세트
              </span>
              <input
                aria-label={`${i + 1}세트 무게(kg)`}
                type="number"
                inputMode="decimal"
                placeholder="kg"
                value={row.weight}
                onChange={(e) => patchDetail(i, "weight", e.target.value)}
                disabled={pending}
                className={inputCls}
              />
              <span className="whitespace-nowrap text-xs text-zinc-500 dark:text-zinc-400">
                kg ×
              </span>
              <input
                aria-label={`${i + 1}세트 횟수`}
                type="number"
                inputMode="numeric"
                value={row.reps}
                onChange={(e) => patchDetail(i, "reps", e.target.value)}
                disabled={pending}
                className="h-9 w-14 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 text-center text-sm"
              />
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                회
              </span>
              <button
                type="button"
                aria-label="세트 삭제"
                onClick={() => removeDetail(i)}
                disabled={pending || detailRows.length <= 1}
                className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 dark:text-zinc-500 transition hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 disabled:opacity-40"
              >
                <X aria-hidden="true" size={15} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addDetail}
            disabled={pending || detailRows.length >= 20}
            className="inline-flex h-8 w-fit items-center gap-1 rounded-md border border-dashed border-zinc-300 dark:border-zinc-600 px-2.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300 transition hover:border-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-400 disabled:opacity-50"
          >
            <Plus aria-hidden="true" size={13} />
            세트 추가
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5">
          <input
            aria-label="세트"
            type="number"
            inputMode="numeric"
            value={sets}
            onChange={(e) => {
              setSets(e.target.value);
              setError(null);
            }}
            disabled={pending}
            className="h-9 w-14 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 text-center text-sm"
          />
          <span className="text-xs text-zinc-500 dark:text-zinc-400">세트</span>
          {/* 고정 끔이면 무게·횟수 입력 숨김 — 운동모드에서 그때그때 설정 */}
          {lockWeightReps ? (
            <>
              <input
                aria-label="횟수"
                type="number"
                inputMode="numeric"
                value={reps}
                onChange={(e) => {
                  setReps(e.target.value);
                  setError(null);
                }}
                disabled={pending}
                className="h-9 w-14 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 text-center text-sm"
              />
              <span className="text-xs text-zinc-500 dark:text-zinc-400">회</span>
              <input
                aria-label="무게(kg)"
                type="number"
                inputMode="decimal"
                placeholder="kg"
                value={weight}
                onChange={(e) => {
                  setWeight(e.target.value);
                  setError(null);
                }}
                disabled={pending}
                className="h-9 w-16 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 text-center text-sm"
              />
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                kg (빈칸=맨몸)
              </span>
            </>
          ) : (
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
              무게·횟수는 운동모드에서 설정
            </span>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
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

/** 편집 모드 하단의"오늘 루틴에 운동 추가" 점선 박스. 클릭 시 인라인 폼으로 확장.
 * 부위 → 운동 → 기구 선택 후 추가하면 즉시 오늘 목록에 합쳐진다. */
function AddExerciseSlot({
  tones,
  dayIndex,
  onAdded,
}: {
  tones: FocusKey[];
  dayIndex: number;
  onAdded: () => void;
}) {
  const [open, setOpen] = useState(false);
  // 휴식일 등으로 tones 가 비면 컴포넌트가 의미 없으므로 렌더 자체를 생략 (Hook 위에 두면 안 됨).
  const [focus, setFocus] = useState<FocusKey>(
    tones[0] ?? ("chest" as FocusKey),
  );
  const exerciseOptions = allExercisesForFocus(focus as FocusTone);
  const [exerciseId, setExerciseId] = useState<string>(
    exerciseOptions[0]?.id ?? "",
  );
  const selectedExercise =
    getCatalogExercise(exerciseId) ?? exerciseOptions[0] ?? null;
  const [equipment, setEquipment] = useState<EquipmentId>(
    selectedExercise?.equipments[0].equipment ?? "barbell",
  );
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function changeFocus(next: FocusKey) {
    setFocus(next);
    const first = allExercisesForFocus(next as FocusTone)[0];
    if (first) {
      setExerciseId(first.id);
      setEquipment(first.equipments[0].equipment);
    }
    setError(null);
  }
  function changeExercise(id: string) {
    setExerciseId(id);
    const ex = getCatalogExercise(id);
    if (ex) setEquipment(ex.equipments[0].equipment);
    setError(null);
  }

  function submit() {
    if (!exerciseId) return;
    start(async () => {
      const res = await addExerciseToTodayAction(
        dayIndex,
        focus,
        exerciseId,
        equipment,
      );
      if (res.ok) {
        setOpen(false);
        setError(null);
        onAdded();
      } else {
        setError(res.error);
      }
    });
  }

  // tones 가 비어 있으면 (예: 휴식일 — 보통 이 컴포넌트는 안 그려지지만 방어) 추가 슬롯 자체를 숨김.
  if (tones.length === 0) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-4 py-5 text-sm font-semibold text-zinc-600 dark:text-zinc-400 transition hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-700 dark:hover:text-emerald-400"
      >
        <Plus aria-hidden="true" size={18} />
        오늘 루틴에 운동 추가
      </button>
    );
  }

  return (
    <div className="rounded-xl border-2 border-dashed border-emerald-400 bg-emerald-50/40 p-3">
      <div className="flex flex-wrap items-center gap-2">
        {tones.length > 1 ? (
          <select
            aria-label="부위"
            value={focus}
            onChange={(e) => changeFocus(e.target.value as FocusKey)}
            disabled={pending}
            className="h-9 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200"
          >
            {tones.map((t) => (
              <option key={t} value={t}>
                {DAY_BLOCKS[t].label}
              </option>
            ))}
          </select>
        ) : (
          <span className="inline-flex h-9 items-center rounded-md bg-white dark:bg-zinc-800 px-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            {DAY_BLOCKS[focus].label}
          </span>
        )}
        <ExerciseSearchSelect
          options={exerciseOptions}
          value={exerciseId}
          onChange={changeExercise}
          disabled={pending || exerciseOptions.length === 0}
        />
        <select
          aria-label="기구"
          value={equipment}
          onChange={(e) => setEquipment(e.target.value as EquipmentId)}
          disabled={pending || !selectedExercise}
          className="h-9 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 text-sm text-zinc-800 dark:text-zinc-200"
        >
          {(selectedExercise?.equipments ?? []).map((eq) => (
            <option key={eq.equipment} value={eq.equipment}>
              {EQUIPMENT_LABELS[eq.equipment]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={submit}
          disabled={pending || !exerciseId}
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
        세트·횟수·무게는 프로필 추천값으로 자동 설정됩니다. 추가 후 운동을 눌러
        상세에서 조절할 수 있어요.
      </p>
      {error ? (
        <p className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
