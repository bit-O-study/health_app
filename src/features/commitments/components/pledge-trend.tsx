"use client";

import { useState } from "react";

import type { BodyPoint, ComparePart, PledgeTrend, TrendTable } from "@/features/commitments/pledge-trend";

/**
 * 다짐 현황 · 주별/월별 변화(2026-10-07) — 지난 기간 대비 한 줄 → 몸 그래프(실제 vs 예상) →
 * 항목 × 기간 표(칸 색 = 지켰나). 월별은 30일 넘는 다짐에서만 켜진다.
 */
export function PledgeTrendView({ trend }: { trend: PledgeTrend }) {
  const [mode, setMode] = useState<"week" | "month">("week");
  const monthly = mode === "month" && trend.monthly;
  const table = monthly ? trend.monthly! : trend.weekly;
  const compare = monthly ? trend.compareMonth : trend.compare;
  const points = monthly ? trend.body?.monthly : trend.body?.weekly;

  return (
    <div className="space-y-3 border-t border-[var(--line)] pt-3" data-testid="pledge-trend" data-mode={mode}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">변화</h3>
        {trend.monthly ? (
          <div role="tablist" aria-label="기간" className="inline-flex rounded-full bg-zinc-100 p-0.5 text-xs dark:bg-white/[0.08]">
            {(["week", "month"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={`rounded-full px-3 py-1 font-semibold ${mode === m ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50" : "text-zinc-500"}`}
              >
                {m === "week" ? "주별" : "월별"}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <CompareLine parts={compare} unit={monthly ? "지난달" : "지난주"} />

      {trend.body && points ? (
        <BodyChart points={points} metric={trend.body.metric} summary={trend.body.summary} />
      ) : null}

      <Table table={table} />
    </div>
  );
}

function CompareLine({ parts, unit }: { parts: ComparePart[] | null; unit: string }) {
  if (parts === null) return null;
  return (
    <p className="text-sm font-semibold leading-6 text-zinc-900 dark:text-zinc-100" data-testid="trend-compare">
      {parts.length === 0 ? (
        `${unit}와 같은 페이스예요`
      ) : (
        <>
          {unit}보다{" "}
          {parts.map((p, i) => (
            <span key={p.text}>
              {i > 0 ? ", " : ""}
              <span className={p.good ? "text-brand" : "text-danger"}>{p.text}</span>
            </span>
          ))}
        </>
      )}
    </p>
  );
}

const CELL: Record<string, string> = {
  ok: "bg-brand-soft text-brand",
  no: "bg-danger/10 text-danger",
  now: "bg-zinc-100 text-zinc-800 outline outline-1 outline-dashed outline-zinc-400 dark:bg-white/[0.06] dark:text-zinc-100",
  future: "text-zinc-300 dark:text-zinc-600",
};

function Table({ table }: { table: TrendTable }) {
  return (
    <div className="overflow-x-auto" data-testid="trend-table">
      <table className="w-full border-separate text-xs tabular-nums" style={{ borderSpacing: "3px" }}>
        <thead>
          <tr>
            <th className="w-[1%]" />
            {table.cols.map((c) => (
              <th key={c} scope="col" className="min-w-10 text-center font-normal text-zinc-500">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((r) => (
            <tr key={r.key}>
              <th scope="row" className="whitespace-nowrap pr-1 text-left font-normal text-zinc-600 dark:text-zinc-300">
                {r.label}
              </th>
              {r.cells.map((c, i) => (
                <td key={i} className={`rounded-md px-1 py-1 text-center font-semibold ${CELL[c.state]}`} data-state={c.state}>
                  {c.text}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-1 flex gap-3 text-xs text-zinc-500">
        <span className="text-brand">■ 지킴</span>
        <span className="text-danger">■ 못 지킴</span>
        <span>┆ 진행 중</span>
      </p>
    </div>
  );
}

/** 실제(선+점) vs 예상(점선). y 눈금은 값 범위에서 3개, 모든 표시는 같은 눈금. */
function BodyChart({
  points,
  metric,
  summary,
}: {
  points: BodyPoint[];
  metric: "weight" | "muscle";
  summary: { change: number; verdict: "on" | "ahead" | "behind" } | null;
}) {
  const vals = points.flatMap((p) => [p.actual, p.predicted]).filter((v): v is number => v !== null);
  const name = metric === "muscle" ? "골격근" : "체중";
  if (points.every((p) => p.actual === null)) {
    return (
      <p className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:bg-white/[0.04]" data-testid="trend-body-empty">
        {name}을 기록하면 여기서 예상과 비교해요
      </p>
    );
  }
  const W = 280;
  const H = 96;
  const L = 30;
  const R = 10;
  const T = 10;
  const B = 74;
  let lo = Math.floor(Math.min(...vals) - 0.3);
  let hi = Math.ceil(Math.max(...vals) + 0.3);
  if (hi - lo < 2) {
    lo -= 1;
    hi += 1;
  }
  const x = (i: number) => (points.length === 1 ? (L + W - R) / 2 : L + ((W - R - L) * i) / (points.length - 1));
  const y = (v: number) => B - ((v - lo) / (hi - lo)) * (B - T);
  const ticks = [lo, (lo + hi) / 2, hi];
  const line = (key: "actual" | "predicted") =>
    points
      .map((p, i) => (p[key] === null ? null : `${x(i).toFixed(1)},${y(p[key]!).toFixed(1)}`))
      .filter(Boolean)
      .join(" ");
  const lastIdx = points.reduce((m, p, i) => (p.actual !== null ? i : m), -1);
  const verdict = summary ? { on: "예상대로", ahead: "예상보다 빨라요", behind: "예상보다 느려요" }[summary.verdict] : null;

  return (
    <figure className="space-y-1" data-testid="trend-body">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${name} 실제와 예상`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="stroke-zinc-200 dark:stroke-white/[0.08]" />
            <text x={L - 4} y={y(t) + 3} textAnchor="end" fontSize="9" className="fill-zinc-400">
              {Number.isInteger(t) ? t : t.toFixed(1)}
            </text>
          </g>
        ))}
        <polyline points={line("predicted")} fill="none" className="stroke-zinc-400" strokeWidth="1.5" strokeDasharray="4 4" />
        <polyline points={line("actual")} fill="none" className="stroke-brand" strokeWidth="2.2" />
        {points.map((p, i) =>
          p.actual === null ? null : (
            <circle key={i} cx={x(i)} cy={y(p.actual)} r={i === lastIdx ? 3.6 : 2.8} className="fill-brand" />
          ),
        )}
        {points.map((p, i) => (
          <text key={p.label} x={x(i)} y={H - 6} textAnchor="middle" fontSize="9" className="fill-zinc-400">
            {p.label}
          </text>
        ))}
      </svg>
      <figcaption className="flex flex-wrap items-center gap-x-3 text-xs text-zinc-500">
        <span>
          <b className="text-brand">―</b> 실제 {name}
        </span>
        <span>┄ 예상</span>
        {summary ? (
          <span className="ml-auto font-semibold text-zinc-700 dark:text-zinc-200">
            {summary.change > 0 ? "+" : summary.change < 0 ? "−" : ""}
            {Math.abs(summary.change)}kg · {verdict}
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}
