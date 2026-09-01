import type { NextConfig } from "next";

/**
 * 배포본 식별자 — 실사용 오류 관측(1.3)에서 "어느 배포에서 난 오류인가"를 보려면
 * 클라이언트가 자기 빌드를 알아야 한다. 앱(APK)은 원격 웹을 띄우므로 실제로 자주
 * 바뀌는 쪽은 이 웹 빌드다. Vercel 이 아니면 'dev'.
 */
const BUILD_ID = (process.env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 7) || "dev";

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_BUILD_ID: BUILD_ID },
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
