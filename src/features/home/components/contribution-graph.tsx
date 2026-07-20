"use client";

import { useRef, type PointerEvent } from "react";

import type { ContributionDay } from "@/features/home/dashboard-metrics";

const LEVEL_CLASS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "bg-zinc-100 dark:bg-zinc-800/70",
  1: "bg-emerald-200 dark:bg-emerald-900/60",
  2: "bg-emerald-400 dark:bg-emerald-700",
  3: "bg-emerald-500 dark:bg-emerald-600",
  4: "bg-emerald-700 dark:bg-emerald-400",
};

const MONTH_LABEL = [
  "1월",
  "2월",
  "3월",
  "4월",
  "5월",
  "6월",
  "7월",
  "8월",
  "9월",
  "10월",
  "11월",
  "12월",
];

/** 셀 한 칸의 실제 픽셀 크기 — grid-template-columns 를 이 값으로 고정해 좁은 화면에서도
 * 찌부러지지 않게 한다(53주 전체는 가로 스크롤/드래그로 본다). */
const CELL_PX = 11;

function monthLabelsFor(weeks: ContributionDay[][]): (string | null)[] {
  let prevMonth = -1;
  return weeks.map((week) => {
    const sunday = week[0];
    const month = Number(sunday.date.slice(5, 7)) - 1;
    if (month === prevMonth) return null;
    prevMonth = month;
    return MONTH_LABEL[month];
  });
}

/** 홈 대시보드 하단 — GitHub 잔디 스타일. 하루 한 칸, 운동 시간만큼 진해진다.
 * 셀 크기를 고정해 찌부러지지 않게 하고, 좌우로는 드래그(마우스)/스와이프(터치)로 넘겨본다. */
export function ContributionGraph({
  days,
  totalWorkoutDays,
}: {
  days: ContributionDay[];
  totalWorkoutDays: number;
}) {
  const weeks: ContributionDay[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  const monthLabels = monthLabelsFor(weeks);

  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; scrollLeft: number } | null>(null);

  // 마우스 드래그로 좌우 스크롤(터치는 브라우저 기본 스와이프 스크롤을 그대로 쓴다).
  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse") return;
    const el = scrollRef.current;
    if (!el) return;
    dragRef.current = { x: e.clientX, scrollLeft: el.scrollLeft };
    el.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const el = scrollRef.current;
    const drag = dragRef.current;
    if (!el || !drag) return;
    el.scrollLeft = drag.scrollLeft - (e.clientX - drag.x);
  }
  function endDrag(e: PointerEvent<HTMLDivElement>) {
    if (dragRef.current) scrollRef.current?.releasePointerCapture(e.pointerId);
    dragRef.current = null;
  }

  const gridCols = `repeat(${weeks.length}, ${CELL_PX}px)`;

  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white/60 p-5 dark:border-white/[0.07] dark:bg-white/[0.02]">
      <p className="mb-4 text-sm">
        <span className="font-black tabular-nums text-zinc-900 dark:text-zinc-50">
          {totalWorkoutDays}
        </span>
        <span className="font-semibold text-zinc-500 dark:text-zinc-400">
          일 운동 · {weeks.length >= 52 ? "최근 1년" : "가입일부터"}
        </span>
      </p>
      <div
        ref={scrollRef}
        className="cursor-grab select-none overflow-x-auto active:cursor-grabbing [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onPointerCancel={endDrag}
      >
        <div className="inline-flex flex-col gap-1">
          <div className="grid gap-[3px]" style={{ gridTemplateColumns: gridCols }}>
            {monthLabels.map((label, i) => (
              <span
                key={i}
                className="whitespace-nowrap text-[10px] font-medium text-zinc-400 dark:text-zinc-500"
              >
                {label ?? ""}
              </span>
            ))}
          </div>
          <div
            className="grid grid-flow-col grid-rows-7 gap-[3px]"
            style={{ gridTemplateColumns: gridCols }}
          >
            {weeks.map((week, wi) =>
              week.map((day, di) =>
                day.level === -1 ? (
                  <span key={`${wi}-${di}`} className="h-2.5 w-2.5" />
                ) : (
                  <span
                    key={`${wi}-${di}`}
                    title={`${day.date} · ${day.minutes}분`}
                    className={`h-2.5 w-2.5 rounded-[2px] ${LEVEL_CLASS[day.level]}`}
                  />
                ),
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}