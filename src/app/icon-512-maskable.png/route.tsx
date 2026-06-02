import { ImageResponse } from "next/og";

/** 마스커블 아이콘. 안전영역(안쪽 80%)에만 H 마크 배치. */
export const dynamic = "force-static";

export const contentType = "image/png";

export async function GET() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #34d399 0%, #059669 55%, #0d9488 100%)",
      }}
    >
      <svg width="250" height="250" viewBox="0 0 24 24" fill="white">
        <rect x="5.2" y="4.6" width="3.2" height="14.8" rx="1.6" />
        <rect x="15.6" y="4.6" width="3.2" height="14.8" rx="1.6" />
        <rect x="7" y="10.4" width="10" height="3.2" rx="1.6" />
      </svg>
    </div>,
    { width: 512, height: 512 },
  );
}
