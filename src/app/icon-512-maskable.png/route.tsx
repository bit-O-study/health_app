import { ImageResponse } from "next/og";

/** 마스커블 아이콘. */
export const dynamic = "force-static";

export const contentType = "image/png";

export async function GET() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(140deg, #60a5fa 0%, #4f46e5 50%, #0891b2 100%)" }}>
      <svg width="240" height="240" viewBox="0 0 24 24">
        <path fill="white" fillRule="evenodd" d="M5.8 3.8h5.4a8.2 8.2 0 0 1 0 16.4H5.8Zm3.1 3v10.4h2.3a5.2 5.2 0 0 0 0-10.4Z" />
        <path d="M9.7 14.2l2-2.6 2 2.6" fill="none" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>,
    { width: 512, height: 512 },
  );
}
