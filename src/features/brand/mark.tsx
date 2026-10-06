/** 헬쑤의 첫 자음 ㅎ + 바벨. 앱·PWA·Android에서 같은 도형을 사용한다. */
export const BRAND_ICON_BG = "#0a6b4e";
export const BRAND_ICON_MINT = "#45d6a0";

/** 기본 SVG 요소만 사용해 ImageResponse에서도 렌더링한다. */
export function HelssuMark({
  size,
  scale = 0.82,
  background,
}: {
  size: number;
  scale?: number;
  background?: string;
}) {
  const t = `translate(50 50) scale(${scale}) translate(-50 -50)`;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      {background ? <rect width="100" height="100" fill={background} /> : null}
      <g transform={t}>
        <line x1="43" y1="17" x2="57" y2="17" stroke={BRAND_ICON_MINT} strokeWidth="7" strokeLinecap="round" />
        <line x1="17" y1="35" x2="83" y2="35" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" />
        <rect x="23" y="25" width="8" height="20" rx="3" fill={BRAND_ICON_MINT} />
        <rect x="69" y="25" width="8" height="20" rx="3" fill={BRAND_ICON_MINT} />
        <circle cx="50" cy="67" r="17" stroke="#ffffff" strokeWidth="8" fill="none" />
      </g>
    </svg>
  );
}
