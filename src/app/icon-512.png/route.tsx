import { ImageResponse } from "next/og";

import { BRAND_ICON_BG, JimkkunMark } from "@/features/brand/mark";

/** PWA 512x512 PNG (any) — 짐꾼 마크(바벨 ㅈ). */
export const dynamic = "force-static";

export const contentType = "image/png";

export async function GET() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: BRAND_ICON_BG }}>
      {JimkkunMark({ size: 512, scale: 0.82 })}
    </div>,
    { width: 512, height: 512 },
  );
}
