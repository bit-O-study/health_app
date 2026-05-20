"use client";

import { useRef, useState, useTransition, type PointerEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, ChevronRight, Dumbbell, GripVertical, X } from "lucide-react";

import { reorderPlanAction } from "@/features/routine/plan-actions";
import { estimateStrengthKcal } from "@/features/routine/calories";
import { setExerciseStatusAction } from "@/features/routine/exercise-completion-actions";

export type TodayPlanItem = {
  id: string;
  exerciseId: string;
  equipment: string;
  name: string;
  equipmentLabel: string;
  sets: number;
  reps: number;
  weightKg: number | null;
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
  const router = useRouter();
  const [order, setOrder] = useState(items);
  const [done, setDone] = useState<Set<string>>(new Set(doneIds));
  const [skipped, setSkipped] = useState<Set<string>>(new Set(skippedIds));
  const [dragIndex, setDragIndex] = useState<number | null>(null);

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

  function setStatus(id: string, target: "done" | "skipped" | "clear") {
    const nextDone = new Set(done);
    const nextSkipped = new Set(skipped);
    nextDone.delete(id);
    nextSkipped.delete(id);
    if (target === "done") nextDone.add(id);
    else if (target === "skipped") nextSkipped.add(id);
    setDone(nextDone);
    setSkipped(nextSkipped);
    startTx(async () => {
      await setExerciseStatusAction(id, target);
      router.refresh();
    });
  }

  /* ── 네이티브 드래그(순서 변경) ─ 그립 핸들에서만 시작 ── */
  function handleHandleDragStart(e: React.DragEvent, index: number) {
    setDragIndex(index);
    // 일부 브라우저는 dataTransfer 비어 있으면 드래그 안 됨
    e.dataTransfer.effectAllowed = "move";
    try {
      e.dataTransfer.setData("text/plain", String(index));
    } catch {
      /* 일부 환경에서 무시 */
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

        return (
          <li
            key={item.id}
            className="relative overflow-hidden rounded-xl"
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(index)}
          >
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

              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <Dumbbell aria-hidden="true" size={20} />
              </span>

              <Link
                href={`/exercises/${item.exerciseId}?eq=${item.equipment}`}
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
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
                      <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        완료
                      </span>
                    ) : null}
                    {isSkipped ? (
                      <span className="ml-2 rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-bold text-zinc-700">
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
