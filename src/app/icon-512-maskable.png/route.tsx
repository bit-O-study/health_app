import { ImageResponse } from "next/og";

import { BRAND_ICON_BG, HelssuMark } from "@/features/brand/mark";

/** 마스커블 아이콘(원형으로 잘려도 안전 영역 안) — 헬쑤 마크(바벨 ㅎ). */
export const dynamic = "force-static";

export async function GET() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: BRAND_ICON_BG }}>
      {HelssuMark({ size: 512, scale: 0.72 })}
    </div>,
    { width: 512, height: 512 },
  );
}
