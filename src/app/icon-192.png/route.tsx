import { ImageResponse } from "next/og";

/** PWA 매니페스트가 참조하는 192x192 PNG. */
export const dynamic = "force-static";

export const contentType = "image/png";

export async function GET() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #34d399 0%, #059669 55%, #0d9488 100%)",
      }}
    >
      <svg width="124" height="124" viewBox="0 0 24 24" fill="none">
        <path d="M12 20.7c-.36 0-.72-.13-1-.4C5.7 15.5 2.5 12.5 2.5 8.9 2.5 6.3 4.5 4.3 7 4.3c1.6 0 3.05.8 3.95 2.05.13.18.4.18.53 0C12.95 5.1 14.4 4.3 16 4.3c2.5 0 4.5 2 4.5 4.6 0 3.6-3.2 6.6-8.5 11.4-.28.27-.64.4-1 .4Z" fill="white" />
        <path d="M6.6 11.7h2.2l1-2 2 4 1-2h2.6" fill="none" stroke="#0f766e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>,
    { width: 192, height: 192 },
  );
}
