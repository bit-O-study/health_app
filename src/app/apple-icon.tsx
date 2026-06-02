import { ImageResponse } from "next/og";

/** iOS "홈 화면에 추가" 용 아이콘. */
export const dynamic = "force-static";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #fb923c 0%, #f97316 55%, #f43f5e 100%)" }}>
      <svg width="122" height="122" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.6" strokeLinecap="round">
        <circle cx="8.5" cy="9.5" r="1.15" fill="white" stroke="none" />
        <circle cx="15.5" cy="9.5" r="1.15" fill="white" stroke="none" />
        <path d="M6.5 14.3c1.4 2 3.3 3 5.5 3s4.1-1 5.5-3" />
      </svg>
    </div>,
    size,
  );
}
