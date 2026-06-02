import type { MetadataRoute } from "next";

/**
 * PWA 매니페스트.
 * Next.js 가 이 파일을 자동으로`/manifest.webmanifest` 로 서빙하고
 * 루트 layout 에`<link rel="manifest">` 를 자동 주입한다.
 *
 * PWABuilder/TWA(Android) 인스톨 기준에 맞춰
 * - name, short_name, start_url, display
 * - 192/512 PNG 아이콘 (any + maskable)
 * - theme/background color
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "헬쑤",
    short_name: "헬쑤",
    description: "오늘 뭐 해야 할지 매일 알려주는 헬스 루틴 앱",
    lang: "ko",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fafafa",
    theme_color: "#4f46e5",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    categories: ["health", "fitness", "lifestyle"],
  };
}
