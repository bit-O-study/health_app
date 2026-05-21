"use client";

import { useRef, useState, useTransition, type PointerEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, ChevronRight, GripVertical, X } from "lucide-react";

import { reorderPlanAction } from "@/features/routine/plan-actions";
import { estimateStrengthKcal } from "@/features/routine/calories";
import { setExerciseStatusAction } from "@/features/routine/exercise-completion-actions";
import { useTodayEdit } from "@/features/routine/components/today-edit-scope";
import { ExerciseIcon } from "@/features/exercises/components/exercise-icon";

/** 한 행 평균 높이 (px) — 위·아래 이동 시 슬롯 계산용 */
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
  focus: string;
};

const SWIPE_THRESHOLD = 80; // px — 넘으면 토글
const SWIPE_VISUAL_CAP = 120; // 시각적 최대 이동

export function TodayPlanList({
  focus,
  items,
  weightKg,
  doneIds,
  skippedIds,
}: {
  focus: string;
  items: TodayPlanItem[];
  weightKg: number | null;
  doneIds: string[];
  skippedIds: string[];
}) {
  const edit = useTodayEdit();
  const editMode = edit.editMode;
  const router = useRouter();
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
  // 현재 dy 기준 새 위치 (다른 행이 비켜줄 자리 계산용)
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

  // 스와이프 상태 — onPointerUp 에서 정확한 dx 를 읽도록 ref + state 병행
  const [swipe, setSwipe] = useState<{ id: string; dx: number } | null>(null);
  const startRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dxRef = useRef(0);
  const lockedRef = useRef<"none" | "horizontal" | "vertical">("none");

  const [, startTx] = useTransition();
  const w = weightKg ?? 65;

  function persistOrder(next: TodayPlanItem[]) {
    startTx(async () => {
      await reorderPlanAction(focus, next.map((i) => i.id));
      router.refresh();
    });
  }

  function setStatus(
    id: string,
    target: "done" | "skipped" | "clear",
  ) {
    const item = order.find((o) => o.id === id);
    const nextDone = new Set(done);
    const nextSkipped = new Set(skipped);
    nextDone.delete(id);
    nextSkipped.delete(id);
    if (target === "done") nextDone.add(id);
    else if (target === "skipped") nextSkipped.add(id);
    setDone(nextDone);
    setSkipped(nextSkipped);
    startTx(async () => {
      await setExerciseStatusAction(
        id,
        target,
        target === "clear" || !item
          ? undefined
          : {
              exerciseId: item.exerciseId,
              equipment: item.equipment,
              sets: item.sets,
              reps: item.reps,
              weightKg: item.weightKg,
              focus: item.focus,
            },
      );
      router.refresh();
    });
  }

  /* ── 포인터 기반 드래그 (그립 핸들에서 시작) ─
   *  마우스·터치 통합. 행이 손가락 따라 들려서 움직이고, 다른 행은 자리를 비켜준다.
   *  네이티브 HTML5 drag 대비 모바일 체감이 훨씬 좋음. */
  function onGripPointerDown(e: PointerEvent<HTMLSpanElement>, index: number) {
    // 행 본체의 스와이프 핸들러까지 전달되지 않게 차단
    e.stopPropagation();
    if (e.pointerType === "mouse" && e.button !== 0) return;
    dragStartYRef.current = e.clientY;
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

  /* ── 좌/우 스와이프(완료/휴식 토글) ── */
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
      // 완료 → 휴식 / 휴식 → 완료 직접 전환 차단 (먼저 취소 후 재시도)
      if (done.has(swipe.id)) capped = Math.max(0, capped);
      if (skipped.has(swipe.id)) capped = Math.min(0, capped);
      dxRef.current = capped;
      setSwipe((p) => (p ? { ...p, dx: capped } : null));
    }
  }
  function onPointerUp(e: PointerEvent<HTMLDivElement>, id: string) {
    const dx = dxRef.current;
    setSwipe(null);
    dxRef.current = 0;
    lockedRef.current = "none";
    const isDone = done.has(id);
    const isSkipped = skipped.has(id);
    if (dx > SWIPE_THRESHOLD && !isSkipped) {
      setStatus(id, isDone ? "clear" : "done");
    } else if (dx < -SWIPE_THRESHOLD && !isDone) {
      setStatus(id, isSkipped ? "clear" : "skipped");
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

  return (
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
            key={item.id}
            className="relative overflow-hidden rounded-xl"
            style={liftStyle}
          >
            {isDragging ? null : (
              <>
                {/* 왼쪽: 오른쪽으로 끌면 노출되는 "완료" 영역 */}
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
                {/* 오른쪽: 왼쪽으로 끌면 노출되는 "휴식" 영역 */}
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

            {/* 전경 행 — 좌/우 스와이프 + 그립으로 순서 변경 */}
            <div
              onPointerDown={(e) => onPointerDown(e, item.id)}
              onPointerMove={onPointerMove}
              onPointerUp={(e) => onPointerUp(e, item.id)}
              onPointerCancel={onPointerCancel}
              style={{
                transform: `translateX(${dx}px)`,
                transition: isSwiping ? "none" : "transform 220ms ease-out",
                touchAction: "pan-y",
              }}
              className={`relative flex items-center gap-2 border bg-white p-4 shadow-sm ${
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
                className={`flex h-10 w-8 shrink-0 cursor-grab touch-none items-center justify-center transition-colors ${
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
                  checked={edit.selectedMain.has(item.id)}
                  onPointerDown={(e) => e.stopPropagation()}
                  onPointerMove={(e) => e.stopPropagation()}
                  onPointerUp={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => edit.toggleMain(item.id)}
                  className="h-5 w-5 shrink-0 accent-red-600"
                />
              ) : null}

              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <ExerciseIcon id={item.exerciseId} size={22} />
              </span>

              <Link
                href={`/exercises/${item.exerciseId}?eq=${item.equipment}`}
                onClick={(e) => {
                  // 스와이프 중이었다면 클릭으로 이동 막기
                  if (Math.abs(dx) > 4) e.preventDefault();
                }}
                className="group flex min-w-0 flex-1 items-center gap-2"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-zinc-950">
                    {item.name}
                    <span className="ml-2 text-xs font-medium text-zinc-500">
                      {item.equipmentLabel}
                    </span>
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
                  </h3>
                  <p className="mt-0.5 text-sm text-zinc-600">
                    {item.sets}세트 × {item.reps}회
                    {item.weightKg !== null
                      ? ` · ${item.weightKg}kg`
                      : " · 맨몸"}
                    <span className="ml-2 text-xs text-orange-700">
                      · 약 {kcal}kcal
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
