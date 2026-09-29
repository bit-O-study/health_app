import { ImageResponse } from "next/og";

import { BRAND_ICON_BG, JimkkunMark } from "@/features/brand/mark";

/** PWA 192x192 PNG — 짐꾼 마크(바벨 ㅈ). */
export const dynamic = "force-static";

export const contentType = "image/png";

export async function GET() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: BRAND_ICON_BG }}>
      {JimkkunMark({ size: 192, scale: 0.82 })}
    </div>,
    { width: 192, height: 192 },
  );
}
