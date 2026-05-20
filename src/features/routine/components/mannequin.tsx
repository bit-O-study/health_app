/**
 * 부위별 밸런스 색상을 그대로 받아 표시하는 정면 마네킹 SVG.
 *   colors 맵으로 각 부위 채움 색을 지정한다.
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

export function Mannequin({
  colors,
}: {
  colors: Record<BodyRegion, string>;
}) {
  return (
    <svg
      viewBox="0 0 200 320"
      className="h-72 w-44"
      role="img"
      aria-label="부위별 발달도 마네킹"
    >
      {/* 윤곽 */}
      <g stroke="#a1a1aa" strokeWidth={1} fill="#f4f4f5">
        <circle cx="100" cy="32" r="20" />
        <rect x="94" y="50" width="12" height="14" />
        <rect x="76" y="60" width="48" height="80" rx="8" />
        <rect x="38" y="68" width="18" height="100" rx="9" />
        <rect x="144" y="68" width="18" height="100" rx="9" />
        <rect x="80" y="140" width="40" height="40" rx="6" />
        <rect x="80" y="178" width="18" height="120" rx="6" />
        <rect x="102" y="178" width="18" height="120" rx="6" />
      </g>

      {/* 컬러 부위 */}
      <ellipse cx="58" cy="74" rx="18" ry="11" fill={colors.shoulder} stroke="#71717a" />
      <ellipse cx="142" cy="74" rx="18" ry="11" fill={colors.shoulder} stroke="#71717a" />
      <rect x="78" y="68" width="44" height="34" rx="6" fill={colors.chest} stroke="#71717a" />
      <rect x="40" y="92" width="14" height="72" rx="7" fill={colors.arm} stroke="#71717a" />
      <rect x="146" y="92" width="14" height="72" rx="7" fill={colors.arm} stroke="#71717a" />
      <rect x="82" y="106" width="36" height="40" rx="6" fill={colors.core} stroke="#71717a" />
      <rect x="82" y="180" width="16" height="110" rx="6" fill={colors.leg} stroke="#71717a" />
      <rect x="102" y="180" width="16" height="110" rx="6" fill={colors.leg} stroke="#71717a" />
      {/* 등(back) — 뒤쪽이라 정면에 표시 못해서 배지로 */}
      <rect x="78" y="296" width="44" height="14" rx="4" fill={colors.back} stroke="#71717a" />
      <text x="100" y="307" fontSize={10} textAnchor="middle" fill="#18181b">
        등(뒤)
      </text>
    </svg>
  );
}
