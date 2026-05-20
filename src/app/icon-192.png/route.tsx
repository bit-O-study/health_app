import { ImageResponse } from "next/og";

/** PWA 매니페스트가 참조하는 192x192 PNG. 빌드 시 한 번만 생성. */
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
        <svg
          width="120"
          height="120"
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
    { width: 192, height: 192 },
  );
}
