import { ImageResponse } from "next/og";

/** iOS "홈 화면에 추가" 용 아이콘. */
export const dynamic = "force-static";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
      <svg width="118" height="118" viewBox="0 0 24 24" fill="white">
        <rect x="5.2" y="4.6" width="3.2" height="14.8" rx="1.6" />
        <rect x="15.6" y="4.6" width="3.2" height="14.8" rx="1.6" />
        <rect x="7" y="10.4" width="10" height="3.2" rx="1.6" />
      </svg>
    </div>,
    size,
  );
}
