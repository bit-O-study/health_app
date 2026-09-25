"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";

import type { ContributionDay } from "@/features/home/dashboard-metrics";

// 브랜드색 하나의 진하기로만 단계를 나눈다(다크모드는 --brand 토큰이 알아서 바뀐다).
const LEVEL_CLASS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "bg-zinc-100 dark:bg-zinc-800/70",
  1: "bg-brand/25",
  2: "bg-brand/50",
  3: "bg-brand/75",
  4: "bg-brand",
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
const CELL_PX = 13;

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
  const [selected, setSelected] = useState<ContributionDay | null>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);
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
    <section aria-label="운동 잔디" className="app-card min-w-0 space-y-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <div><h2 className="text-base font-bold">차곡차곡, 운동 잔디</h2><p className="mt-1 text-xs text-muted">꾸준히 쌓인 나의 움직임</p></div>
        <span className="rounded-full bg-brand/10 px-3 py-1 text-sm font-semibold tabular-nums text-brand">{totalWorkoutDays}일 기록</span>
      </div>

      <div
        ref={scrollRef}
        className="max-w-full cursor-grab touch-pan-x select-none overflow-x-auto overscroll-x-contain active:cursor-grabbing [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                className="whitespace-nowrap text-xs text-zinc-400 dark:text-zinc-500"
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
                  <span key={`${wi}-${di}`} className="h-[13px] w-[13px]" />
                ) : (
                  <button
                    type="button"
                    key={`${wi}-${di}`}
                    aria-label={`${day.date} · ${day.minutes}분`}
                    aria-pressed={selected?.date === day.date}
                    onPointerDown={event => event.stopPropagation()}
                    onClick={() => setSelected(day)}
                    title={`${day.date} · ${day.minutes}분`}
                    className={`h-[13px] w-[13px] rounded-[3px] ring-inset ring-black/5 transition hover:scale-125 focus-visible:outline-2 focus-visible:outline-brand ${LEVEL_CLASS[day.level]}`}
                  />
                ),
              ),
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <p role="status">{selected ? `${selected.date} · ${selected.minutes}분 운동` : "날짜를 누르면 운동 시간을 볼 수 있어요"}</p>
        <div className="flex items-center gap-1.5" aria-label="운동 시간이 많을수록 진한 색"><span>적음</span>{([0, 1, 2, 3, 4] as const).map(level => <span key={level} className={`h-3 w-3 rounded-[3px] ${LEVEL_CLASS[level]}`} />)}<span>많음</span></div>
      </div>
    </section>
  );
}