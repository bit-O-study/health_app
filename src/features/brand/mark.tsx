/**
 * 짐꾼 로고 마크 — 바벨로 만든 "ㅈ" (2026-09-29 확정, docs/jimkkun-logo-review-2026-09-29.html).
 *
 *  - 가로획 = 바벨(흰 봉 + 민트 원판). 짐꾼이 짊어지는 "짐" = 헬스장의 무게.
 *  - 아래 ㅅ = 바벨을 받친 두 다리 / 위로 오르는 화살표(점진적 과부하).
 *
 * 앱 안 로고(`LogoMark`), 파비콘·PWA 아이콘 라우트(`ImageResponse`), 안드로이드 아이콘 PNG
 * (`tools/brand/render-icons.mjs`)가 **이 한 벌의 도형**을 쓴다 — 곳곳에 따로 그리면
 * 한쪽만 바뀌는 날이 온다. `ImageResponse`(satori)에서도 그려지게 기본 SVG 요소만 쓴다.
 */

/** 아이콘 바탕 초록 — 앱 브랜드색(#087f5b)보다 한 단계 짙게. */
export const BRAND_ICON_BG = "#0a6b4e";
/** 원판 민트 — 다크 모드 브랜드색과 같다. */
export const BRAND_ICON_MINT = "#45d6a0";

/**
 * 마크 도형(viewBox 0 0 100 100, 바탕 없음).
 * @param scale 도형을 가운데 기준으로 줄이는 비율 — 둥근 사각 아이콘 0.82,
 *              원형으로 잘리는 적응형·마스커블 아이콘은 0.72(안전 영역 안).
 */
export function JimkkunMark({
  size,
  scale = 0.82,
  background,
}: {
  size: number;
  scale?: number;
  /** 바탕색. 없으면 투명(도형만). */
  background?: string;
}) {
  const t = `translate(50 50) scale(${scale}) translate(-50 -50)`;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      {background ? <rect width="100" height="100" fill={background} /> : null}
      <g transform={t}>
        <line x1="15" y1="34" x2="85" y2="34" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
        <rect x="21" y="21" width="7" height="26" rx="2.2" fill={BRAND_ICON_MINT} />
        <rect x="29.5" y="26" width="4.5" height="16" rx="1.6" fill={BRAND_ICON_MINT} />
        <rect x="72" y="21" width="7" height="26" rx="2.2" fill={BRAND_ICON_MINT} />
        <rect x="66" y="26" width="4.5" height="16" rx="1.6" fill={BRAND_ICON_MINT} />
        <path
          d="M50 44 L31 78 M50 44 L69 78"
          stroke="#ffffff"
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>
    </svg>
  );
}
