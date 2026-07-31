import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "@/styles/globals.css";

import { PWARegister } from "@/app/_pwa-register";
import { RouteKeeper } from "@/app/_route-keeper";
import { BottomNav } from "@/components/bottom-nav";
import { getCurrentUser } from "@/lib/supabase/server";
import { isDebugFeatureEnabled } from "@/features/admin/debug-features.server";
import { getGroupMode } from "@/features/groups/group-mode.server";
import { NotificationCenterProvider } from "@/features/notifications/notification-center";
import { AppSplash } from "@/features/brand/app-splash";
import { ThemeScript } from "@/features/theme/theme-script";
import { absoluteUrl, siteConfig } from "@/lib/seo";

// ⚡ 서버 함수를 DB(Supabase, ap-southeast-1 싱가포르)와 같은 리전에서 실행한다.
// 기본 리전(미국)에서 돌면 매 쿼리가 미국↔싱가포르(200ms+)를 왕복해 TTFB 가 수 초까지
// 치솟는다. DB 와 같은 sin1 에 두면 왕복이 ~5ms 로 줄어 TTFB 가 크게 개선된다.
// (루트 레이아웃에 두어 전 라우트에 적용. Vercel Project Settings 의 Functions Region
//  으로도 같이 지정하면 확실하다.)
export const preferredRegion = "sin1";

const PWA_ICON_VERSION = "20260702b";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: siteConfig.title, template: "%s | 헬쑤" },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: `/icon-192-${PWA_ICON_VERSION}.png`,
    apple: `/apple-touch-icon-${PWA_ICON_VERSION}.png`,
  },
  openGraph: {
    title: siteConfig.title,
    description: siteConfig.description,
    url: absoluteUrl("/"),
    siteName: siteConfig.name,
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
  },
  appleWebApp: {
    capable: true,
    title: siteConfig.name,
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 로그인 전에는 하단 탭을 숨긴다(로그인 후에만 앱 네비 노출).
  const user = await getCurrentUser();
  const isLoggedIn = Boolean(user);
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* 페인트 전에 .dark 를 미리 붙여 라이트→다크 깜빡임 방지 */}
        <ThemeScript />
      </head>
      <body className="min-h-full flex flex-col">
        <NotificationCenterProvider>
          <AppSplash />
          {children}
          {isLoggedIn ? (
            <Suspense fallback={<BottomNav />}>
              <ConfiguredBottomNav />
            </Suspense>
          ) : null}
          {isLoggedIn ? <RouteKeeper /> : null}
        </NotificationCenterProvider>
        <PWARegister />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

async function ConfiguredBottomNav() {
  const [showCoach, groupMode] = await Promise.all([
    isDebugFeatureEnabled("helssu-coach"),
    getGroupMode(),
  ]);
  return <BottomNav showCoach={showCoach} groupTheme={groupMode === "gym"} />;
}
