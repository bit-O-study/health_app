import { ImageResponse } from "next/og";

/** iOS 홈 화면 아이콘. */
export const dynamic = "force-static";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #f472b6 0%, #ec4899 52%, #c026d3 100%)" }}>
      <svg width="130" height="130" viewBox="0 0 24 24" fill="none">
        <path d="M2.6 13h3.3l1.5-4.2c.3-.85 1.45-.72 1.62.12l2.18 7.3 1.8-5.2c.27-.78 1.34-.74 1.55.06L17.1 13h1.7" stroke="white" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="20.9" cy="13" r="1.5" fill="white" />
      </svg>
    </div>,
    size,
  );
}
