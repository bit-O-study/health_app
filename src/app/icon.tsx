import { ImageResponse } from "next/og";

import { BRAND_ICON_BG, HelssuMark } from "@/features/brand/mark";

/** 파비콘 — 헬쑤 마크(바벨 ㅎ). */
export const dynamic = "force-static";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, background: BRAND_ICON_BG }}>
      {HelssuMark({ size: 32, scale: 0.9 })}
    </div>,
    size,
  );
}
