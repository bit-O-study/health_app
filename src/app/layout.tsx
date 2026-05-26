import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/styles/globals.css";

import { PWARegister } from "@/app/_pwa-register";
import { ThemeScript } from "@/features/theme/theme-script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "HELTCH", template: "%s | HELTCH" },
  description: "오늘 뭐 해야 할지 매일 알려주는 헬스 루틴 앱",
  applicationName: "HELTCH",
  appleWebApp: {
    capable: true,
    title: "HELTCH",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
        {children}
        <PWARegister />
      </body>
    </html>
  );
}
