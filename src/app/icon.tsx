import { ImageResponse } from "next/og";

// 브라우저 탭 파비콘 — 로고 마크와 동일한 그라데이션 덤벨.
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
        <rect x="7" y="10.6" width="10" height="2.8" rx="1.4" />
        <rect x="2.3" y="6.9" width="3.3" height="10.2" rx="1.5" />
        <rect x="18.4" y="6.9" width="3.3" height="10.2" rx="1.5" />
        <rect x="5.7" y="8.8" width="2.5" height="6.4" rx="1.2" />
        <rect x="15.8" y="8.8" width="2.5" height="6.4" rx="1.2" />
      </svg>
    </div>,
    size,
  );
}
