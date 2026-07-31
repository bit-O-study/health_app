import type { BodyLog } from "@/features/profile/body-logs";
import {
  buildBodySeries,
  dateTickIndexes,
  seriesDelta,
  shortDateLabel,
  type BodySeries,
} from "@/features/profile/body-chart-data";

/** 지표 하나의 미니 추이 차트(자체 [min,max] 스케일). */
function MetricChart({ s }: { s: BodySeries }) {
  const W = 320;
  const H = 96;
  const padX = 10;
  const padY = 12;
  const xFor = (i: number) =>
    s.points.length === 1
      ? W / 2
      : padX + (i * (W - padX * 2)) / (Math.max(...s.points.map((p) => p.i)) || 1);
  // 이 지표 값들의 min~max 를 차트 높이에 정규화(값이 하나면 가운데 선).
  const span = s.max - s.min || 1;
  const yFor = (v: number) =>
    s.max === s.min ? H / 2 : H - padY - ((v - s.min) / span) * (H - padY * 2);
  const poly = s.points.map((p) => `${xFor(p.i)},${yFor(p.v)}`).join(" ");
  const delta = seriesDelta(s);
  const deltaText =
    delta === 0 ? "변화 없음" : `${delta > 0 ? "+" : ""}${delta}${s.unit}`;
  // x축 날짜 눈금 — 점이 많아도 겹치지 않게 최대 4개(첫·마지막 포함).
  const ticks = dateTickIndexes(s.points.length);
  const lastPoint = s.points[s.points.length - 1];

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-800">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: s.color }}
          />
          {s.label}
        </span>
        <span className="flex items-baseline gap-1.5">
          <span className="text-base font-bold text-zinc-950 dark:text-zinc-50">
            {s.latest}
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {s.unit}
            </span>
          </span>
          <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500">
            {deltaText}
          </span>
        </span>
      </div>

      {/* 최근 값이 '언제' 잰 것인지 — 그래프만 보면 알 수 없어서 함께 표시. */}
      <div className="mb-1 text-right text-[10px] text-zinc-400 dark:text-zinc-500">
        {shortDateLabel(lastPoint.createdAt)} 측정
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-24 w-full"
          role="img"
          aria-label={`${s.label} 추이`}
        >
          {s.points.length > 1 ? (
            <polyline
              points={poly}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
          {s.points.map((p) => (
            <circle
              key={p.i}
              cx={xFor(p.i)}
              cy={yFor(p.v)}
              r={2.5}
              fill={s.color}
            />
          ))}
        </svg>
        {/* y축 범위(최소~최대) — 스케일이 명확하게 */}
        <span className="pointer-events-none absolute right-1 top-0 text-[10px] text-zinc-400 dark:text-zinc-500">
          {s.max}
          {s.unit}
        </span>
        <span className="pointer-events-none absolute bottom-0 right-1 text-[10px] text-zinc-400 dark:text-zinc-500">
          {s.min}
          {s.unit}
        </span>
      </div>

      {/* x축 날짜 — 점 위치에 맞춰 찍는다(양끝은 잘리지 않게 안쪽 정렬). */}
      <div className="relative mt-0.5 h-3.5">
        {ticks.map((idx, k) => {
          const p = s.points[idx];
          const left = (xFor(p.i) / W) * 100;
          const align =
            k === 0 && ticks.length > 1
              ? "translateX(0)"
              : k === ticks.length - 1 && ticks.length > 1
                ? "translateX(-100%)"
                : "translateX(-50%)";
          return (
            <span
              key={p.i}
              className="absolute top-0 whitespace-nowrap text-[10px] text-zinc-400 dark:text-zinc-500"
              style={{ left: `${left}%`, transform: align }}
            >
              {shortDateLabel(p.createdAt)}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 체형 추이 — 지표(키·몸무게·체지방·근육량)마다 **별도 미니 차트**로 나눠 그린다.
 * (예전엔 전부 한 그래프에 겹쳐 스케일이 뒤섞여 이상하게 보였다.)
 */
export function BodyChart({ logs }: { logs: BodyLog[] }) {
  const series = buildBodySeries(logs);
  if (series.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-900 p-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
        아직 기록이 없습니다. 체형을 등록하면 추이가 그려집니다.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      {series.map((s) => (
        <MetricChart key={s.key} s={s} />
      ))}
    </div>
  );
}
