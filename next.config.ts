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
};

export default nextConfig;
