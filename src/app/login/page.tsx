import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Logo } from "@/features/brand/logo";
import { AuthForm } from "@/features/auth/components/auth-form";
import { safeRedirectPath } from "@/features/auth/oauth-redirect";
import { getCurrentUser } from "@/lib/supabase/server";
import { destinationAfterLogin } from "@/features/auth/actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "로그인",
  description: "헬쑤에 로그인하고 내 운동 루틴을 이어가세요.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}) {
  const { redirect: redirectParam, error: oauthError } = await searchParams;
  const redirectTo = safeRedirectPath(redirectParam);

  const user = await getCurrentUser();
  if (user) {
    redirect(await destinationAfterLogin(redirectTo));
  }

  // 촘촘한 입구 화면(2026-09-16 8단계) — 로고 + 큰 제목 + 폼 한 줄기. 설명 문장은 뺐다.
  return (
    <div className="app-page">
      <main className="app-container flex min-h-dvh max-w-sm flex-col justify-center gap-5 py-10">
        <Link className="flex items-center self-start px-1" href="/">
          <Logo size={36} wordClassName="text-lg" />
        </Link>
        <h1 className="app-title px-1">내 루틴 시작하기</h1>
        <AuthForm redirectTo={redirectTo} initialError={oauthError ?? null} />
      </main>
    </div>
  );
}
