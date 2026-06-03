import type { Point } from "@/features/routine/progress";

/** 의존성 없는 단순 SVG 라인 차트(영역 채움 + 점 + 마지막값 라벨). */
export function LineChart({
  points,
  color = "#4f46e5",
  unit = "",
  height = 150,
}: {
  points: Point[];
  color?: string;
  unit?: string;
  height?: number;
}) {
  if (points.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-dashed border-zinc-300 dark:border-zinc-600 text-xs text-zinc-400"
        style={{ height }}
      >
        데이터가 아직 없어요
      </div>
    );
  }

  const W = 320;
  const H = height;
  const pad = { l: 10, r: 10, t: 14, b: 20 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const ys = points.map((p) => p.value);
  const maxY = Math.max(...ys);
  const minY = Math.min(...ys, 0);
  const range = maxY - minY || 1;
  const n = points.length;
  const x = (i: number) =>
    pad.l + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => pad.t + innerH - ((v - minY) / range) * innerH;

  const linePts = points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ");
  const areaPts = `${x(0)},${pad.t + innerH} ${linePts} ${x(n - 1)},${pad.t + innerH}`;
  const last = points[n - 1];
  const fmt = (d: string) => {
    const [, m, day] = d.split("-");
    return `${Number(m)}/${Number(day)}`;
  };
  const gid = `g-${color.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label="추이 그래프"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPts} fill={`url(#${gid})`} />
      <polyline
        points={linePts}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((p, i) => (
        <circle key={p.date} cx={x(i)} cy={y(p.value)} r={i === n - 1 ? 3.5 : 2} fill={color} />
      ))}
      {/* 마지막 값 라벨 */}
      <text
        x={x(n - 1)}
        y={Math.max(pad.t + 9, y(last.value) - 7)}
        textAnchor="end"
        fontSize="11"
        fontWeight="700"
        fill={color}
      >
        {Math.round(last.value).toLocaleString()}
        {unit}
      </text>
      {/* x 축: 첫·마지막 날짜 */}
      <text x={x(0)} y={H - 5} fontSize="10" fill="#a1a1aa">
        {fmt(points[0].date)}
      </text>
      {n > 1 ? (
        <text x={x(n - 1)} y={H - 5} textAnchor="end" fontSize="10" fill="#a1a1aa">
          {fmt(last.date)}
        </text>
      ) : null}
    </svg>
  );
}
