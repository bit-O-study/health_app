import { ImageResponse } from "next/og";

/**
 * 마스커블 아이콘. 런처가 임의의 모양(원/스쿼클 등)으로 크롭하므로
 * 의미 있는 콘텐츠는 안쪽 80% 안전영역(약 410x410) 에만 배치.
 */
export const dynamic = "force-static";

export const contentType = "image/png";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#059669",
        }}
      >
        {/* 안전영역 안에만 그림 — 크롭돼도 잘리지 않음 */}
        <svg
          width="280"
          height="280"
          viewBox="0 0 32 32"
          fill="none"
          stroke="white"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2" y="11" width="5" height="10" rx="1" />
          <rect x="25" y="11" width="5" height="10" rx="1" />
          <line x1="7" y1="16" x2="25" y2="16" />
          <line x1="9" y1="13" x2="9" y2="19" />
          <line x1="23" y1="13" x2="23" y2="19" />
        </svg>
      </div>
    ),
    { width: 512, height: 512 },
  );
}
