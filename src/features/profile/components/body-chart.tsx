import type { BodyLog, BodyMetricKey } from "@/features/profile/body-logs";

const SERIES: {
  key: BodyMetricKey;
  label: string;
  unit: string;
  color: string;
}[] = [
  { key: "weightKg", label: "몸무게", unit: "kg", color: "#059669" },
  { key: "bodyFatPct", label: "체지방률", unit: "%", color: "#e11d48" },
  { key: "muscleMassKg", label: "근육량", unit: "kg", color: "#6366f1" },
  { key: "heightCm", label: "키", unit: "cm", color: "#d97706" },
];

export function BodyChart({ logs }: { logs: BodyLog[] }) {
  if (logs.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-900 p-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
        아직 기록이 없습니다. 체형을 등록하면 추이가 그려집니다.
      </p>
    );
  }

  const W = 640;
  const H = 240;
  const padX = 16;
  const padY = 18;
  const xFor = (i: number) =>
    logs.length === 1 ? W / 2 : padX + (i * (W - padX * 2)) / (logs.length - 1);

  const rendered = SERIES.map((s) => {
    const pts = logs
      .map((l, i) => ({ i, v: l[s.key] }))
      .filter((p): p is { i: number; v: number } => p.v !== null);
    if (pts.length === 0) return null;
    const vals = pts.map((p) => p.v);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = max - min || 1;
    // 시리즈마다 스케일이 달라 각자 [min,max]를 차트 높이에 정규화
    const yFor = (v: number) => H - padY - ((v - min) / span) * (H - padY * 2);
    const poly = pts.map((p) => `${xFor(p.i)},${yFor(p.v)}`).join("");
    const latest = pts[pts.length - 1].v;
    return { ...s, pts, poly, yFor, latest };
  }).filter((x): x is NonNullable<typeof x> => x !== null);

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1">
        {rendered.map((s) => (
          <span
            key={s.key}
            className="inline-flex items-center gap-1.5 text-sm"
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">
              {s.label}
            </span>
            <span className="text-zinc-500 dark:text-zinc-400">
              {s.latest}
              {s.unit}
            </span>
          </span>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-56 w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
        preserveAspectRatio="none"
        role="img"
        aria-label="체형 지표 추이 그래프"
      >
        {rendered.map((s) => (
          <g key={s.key}>
            {s.pts.length > 1 ? (
              <polyline
                points={s.poly}
                fill="none"
                stroke={s.color}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}
            {s.pts.map((p) => (
              <circle
                key={p.i}
                cx={xFor(p.i)}
                cy={s.yFor(p.v)}
                r={3}
                fill={s.color}
              />
            ))}
          </g>
        ))}
      </svg>

      <div className="mt-1 flex justify-between text-[11px] text-zinc-400 dark:text-zinc-500">
        <span>{fmtDate(logs[0].createdAt)}</span>
        <span>{fmtDate(logs[logs.length - 1].createdAt)}</span>
      </div>
      <p className="mt-2 text-[11px] text-zinc-400 dark:text-zinc-500">
        지표마다 단위가 달라 각 선은 자체 최소~최대 범위로 정규화해 추이만
        비교합니다.
      </p>
    </div>
  );
}
