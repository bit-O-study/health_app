/**
 * 부위별 발달도(0..100)에 따라 색상으로 강조하는 단순 정면 마네킹 SVG.
 *   gray → light → mid → high → red 순으로 진해진다.
 */

export type BodyRegion = "chest" | "back" | "shoulder" | "arm" | "leg" | "core";

export const REGION_LABEL: Record<BodyRegion, string> = {
  chest: "가슴",
  back: "등",
  shoulder: "어깨",
  arm: "팔",
  leg: "다리",
  core: "코어",
};

function colorFor(level: number): string {
  if (level <= 0) return "#e4e4e7"; // zinc-200
  if (level < 25) return "#bbf7d0"; // emerald-200
  if (level < 50) return "#34d399"; // emerald-400
  if (level < 75) return "#fbbf24"; // amber-400
  return "#f43f5e"; // rose-500
}

export function Mannequin({
  scores,
}: {
  scores: Record<BodyRegion, number>;
}) {
  const fill = {
    chest: colorFor(scores.chest),
    back: colorFor(scores.back),
    shoulder: colorFor(scores.shoulder),
    arm: colorFor(scores.arm),
    leg: colorFor(scores.leg),
    core: colorFor(scores.core),
  };

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox="0 0 200 320"
        className="h-72 w-44"
        role="img"
        aria-label="부위별 발달도 마네킹"
      >
        {/* 윤곽 (옅은 회색 배경) */}
        <g stroke="#a1a1aa" strokeWidth={1} fill="#f4f4f5">
          <circle cx="100" cy="32" r="20" />
          <rect x="94" y="50" width="12" height="14" />
          <rect x="76" y="60" width="48" height="80" rx="8" />
          {/* arms */}
          <rect x="38" y="68" width="18" height="100" rx="9" />
          <rect x="144" y="68" width="18" height="100" rx="9" />
          {/* lower torso */}
          <rect x="80" y="140" width="40" height="40" rx="6" />
          {/* legs */}
          <rect x="80" y="178" width="18" height="120" rx="6" />
          <rect x="102" y="178" width="18" height="120" rx="6" />
        </g>

        {/* 컬러 부위 */}
        {/* 어깨 (좌/우) */}
        <ellipse cx="58" cy="74" rx="18" ry="11" fill={fill.shoulder} stroke="#71717a" />
        <ellipse cx="142" cy="74" rx="18" ry="11" fill={fill.shoulder} stroke="#71717a" />
        {/* 가슴 */}
        <rect x="78" y="68" width="44" height="34" rx="6" fill={fill.chest} stroke="#71717a" />
        {/* 팔 (좌/우) */}
        <rect x="40" y="92" width="14" height="72" rx="7" fill={fill.arm} stroke="#71717a" />
        <rect x="146" y="92" width="14" height="72" rx="7" fill={fill.arm} stroke="#71717a" />
        {/* 코어 */}
        <rect x="82" y="106" width="36" height="40" rx="6" fill={fill.core} stroke="#71717a" />
        {/* 다리 (좌/우) */}
        <rect x="82" y="180" width="16" height="110" rx="6" fill={fill.leg} stroke="#71717a" />
        <rect x="102" y="180" width="16" height="110" rx="6" fill={fill.leg} stroke="#71717a" />
        {/* 등(back) 표시 — 작은 배지 */}
        <rect x="78" y="296" width="44" height="14" rx="4" fill={fill.back} stroke="#71717a" />
        <text x="100" y="307" fontSize={10} textAnchor="middle" fill="#18181b">
          등(뒤)
        </text>
      </svg>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-zinc-600">
        {[
          { v: 0, label: "없음" },
          { v: 24, label: "약" },
          { v: 49, label: "중" },
          { v: 74, label: "강" },
          { v: 90, label: "최상" },
        ].map((g) => (
          <span key={g.label} className="inline-flex items-center gap-1">
            <span
              className="h-2.5 w-2.5 rounded"
              style={{ backgroundColor: colorFor(g.v) }}
            />
            {g.label}
          </span>
        ))}
      </div>
    </div>
  );
}
