import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "@/styles/globals.css";

import { PWARegister } from "@/app/_pwa-register";
import { BottomNav } from "@/components/bottom-nav";
import { isDebugFeatureEnabled } from "@/features/admin/debug-features.server";
import { NotificationCenterProvider } from "@/features/notifications/notification-center";
import { AppSplash } from "@/features/brand/app-splash";
import { ThemeScript } from "@/features/theme/theme-script";
import { absoluteUrl, siteConfig } from "@/lib/seo";

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
  icons: {
    icon: "/icon-192.png?v=helssu-20260611",
    apple: "/apple-touch-icon.png?v=helssu-20260611",
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
  // 헬쑤쌤 탭 노출 여부(디버그 계정 + 기능 켜짐). 일반 사용자는 false.
  const showCoach = await isDebugFeatureEnabled("helssu-coach");
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
          <BottomNav showCoach={showCoach} />
        </NotificationCenterProvider>
        <PWARegister />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
