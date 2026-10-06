import { ImageResponse } from "next/og";

import { BRAND_ICON_BG, HelssuMark } from "@/features/brand/mark";

/** iOS 홈 화면 아이콘 — 헬쑤 마크(바벨 ㅎ). */
export const dynamic = "force-static";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: BRAND_ICON_BG }}>
      {HelssuMark({ size: 180, scale: 0.82 })}
    </div>,
    size,
  );
}
