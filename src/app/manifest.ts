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
    // 네이티브 스플래시(앱 켜자마자 OS가 그리는 첫 화면) 배경 — 진입 모션 화면과
    // 같은 톤이라 정적→모션 전환이 자연스럽게 이어진다.
    background_color: "#eef3ff",
    theme_color: "#4f46e5",
    icons: [
      {
        src: "/icon-192.png?v=helssu-20260611",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png?v=helssu-20260611",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512-maskable.png?v=helssu-20260611",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    categories: ["health", "fitness", "lifestyle"],
  };
}
