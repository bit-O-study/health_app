import { ImageResponse } from "next/og";

// 브라우저 탭 파비콘 — 로고 마크와 동일한 그라데이션 H 마크.
export const dynamic = "force-static";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 8,
        background: "linear-gradient(135deg, #34d399 0%, #059669 55%, #0d9488 100%)",
      }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
        <rect x="5.2" y="4.6" width="3.2" height="14.8" rx="1.6" />
        <rect x="15.6" y="4.6" width="3.2" height="14.8" rx="1.6" />
        <rect x="7" y="10.4" width="10" height="3.2" rx="1.6" />
      </svg>
    </div>,
    size,
  );
}
