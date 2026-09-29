import { ImageResponse } from "next/og";

import { BRAND_ICON_BG, JimkkunMark } from "@/features/brand/mark";

/** iOS 홈 화면 아이콘 — 짐꾼 마크(바벨 ㅈ). */
export const dynamic = "force-static";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: BRAND_ICON_BG }}>
      {JimkkunMark({ size: 180, scale: 0.82 })}
    </div>,
    size,
  );
}
