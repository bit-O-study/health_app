import { ImageResponse } from "next/og";

import { BRAND_ICON_BG, HelssuMark } from "@/features/brand/mark";

/** PWA 192x192 PNG — 헬쑤 마크(바벨 ㅎ). */
export const dynamic = "force-static";

export async function GET() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: BRAND_ICON_BG }}>
      {HelssuMark({ size: 192, scale: 0.82 })}
    </div>,
    { width: 192, height: 192 },
  );
}
