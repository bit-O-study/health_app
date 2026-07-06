import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 이미지 최적화 — 별다른 raw <img> 는 없지만 next/image 사용 시 AVIF/WebP 우선
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 7, // 일주일
  },
  // 압축은 기본 활성화이지만 명시
  compress: true,
  // X-Powered-By 헤더 제거 — 보안·바이트 절감
  poweredByHeader: false,
  // 배럴 import 트리셰이킹 — 아이콘 등에서 쓰는 만큼만 번들(동작 동일, JS만 축소).
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  async headers() {
    return [
      {
        source: "/manifest.webmanifest",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
