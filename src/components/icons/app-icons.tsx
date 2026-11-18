import type { SVGProps } from "react";

/**
 * 헬쑤 전용 단색 아이콘 — 이모지·기성 아이콘 대신 직접 그린 것.
 * 색은 넣지 않는다: 선은 `currentColor` 라 둘러싼 글자색(보통 text-muted·기본 글자색)을 그대로 따른다.
 * 24×24 격자, 선 굵기 2, 끝이 둥근 선 — 바벨 로고(mark.tsx)와 같은 말투.
 */
type IconProps = Omit<SVGProps<SVGSVGElement>, "children"> & { size?: number };

function Base({ size = 16, ...rest }: IconProps & { children?: never }, body: React.ReactNode) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {body}
    </svg>
  );
}

/** 칼로리 — 물방울 모양 불꽃과 안쪽 한 획. */
export function KcalIcon(props: IconProps) {
  return Base(
    props,
    <>
      <path d="M12 3c.4 3.6 5.6 5.6 5.6 10.6a5.6 5.6 0 0 1-11.2 0c0-2.3 1.2-3.8 2.6-5.1.3 1.5 1 2.4 2 2.7C11 8.6 10.9 5.8 12 3Z" />
      <path d="M12 17.2c-1.1 0-1.9-.8-1.9-1.8" />
    </>,
  );
}

/** 코인 — 동전 테두리 안에 바벨 한 개(헬쑤 로고의 막대와 원판). */
export function CoinIcon(props: IconProps) {
  return Base(
    props,
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12h7" />
      <path d="M8.5 9.8v4.4M15.5 9.8v4.4" />
    </>,
  );
}

/** 반짝임 — 네 갈래 별 하나와 작은 점. 축하·AI 표시에 쓴다. */
export function SparkIcon(props: IconProps) {
  return Base(
    props,
    <>
      <path d="M11 3.5c.6 4.2 2.3 5.9 6.5 6.5-4.2.6-5.9 2.3-6.5 6.5-.6-4.2-2.3-5.9-6.5-6.5 4.2-.6 5.9-2.3 6.5-6.5Z" />
      <path d="M18.5 16.5v3.5M16.75 18.25h3.5" />
    </>,
  );
}

/** 좋아요 — 하트 윤곽. */
export function HeartIcon(props: IconProps) {
  return Base(props, <path d="M12 20s-7.5-4.6-7.5-10.1A4.2 4.2 0 0 1 12 7.4a4.2 4.2 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20Z" />);
}

/** 번개 — 연속 기록(일주일 연속). */
export function BoltIcon(props: IconProps) {
  return Base(props, <path d="M13 3 5.5 13.2H11L10 21l8.5-10.6H13L13 3Z" />);
}

/** 보석 — 2주 연속·다이아 등급. */
export function GemIcon(props: IconProps) {
  return Base(
    props,
    <>
      <path d="M6.5 4h11L21 9.5 12 20 3 9.5 6.5 4Z" />
      <path d="M3 9.5h18M9.2 4 8 9.5 12 20l4-10.5L14.8 4" />
    </>,
  );
}

/** 트로피 — 30일 연속·1위. */
export function TrophyIcon(props: IconProps) {
  return Base(
    props,
    <>
      <path d="M7.5 4h9v5a4.5 4.5 0 0 1-9 0V4Z" />
      <path d="M7.5 6H4.5c0 3 1 4.5 3.2 5M16.5 6h3c0 3-1 4.5-3.2 5" />
      <path d="M12 13.5V17M8.5 20h7M10 17h4" />
    </>,
  );
}

