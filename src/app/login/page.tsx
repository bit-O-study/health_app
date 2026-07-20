import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Logo } from "@/features/brand/logo";
import { AuthForm } from "@/features/auth/components/auth-form";
import { safeRedirectPath } from "@/features/auth/oauth-redirect";
import { getCurrentUser } from "@/lib/supabase/server";

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
    redirect(redirectTo);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-zinc-50 dark:bg-zinc-900 px-6 py-12">
      <Link className="flex items-center" href="/">
        <Logo size={44} wordClassName="text-lg" />
      </Link>

      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-100">
          로그인하고 내 루틴 시작하기
        </h1>
        <p className="max-w-sm text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          회원별로 루틴을 저장하면 매일 그날 해야 할 운동을 메인에서 바로 확인할
          수 있습니다.
        </p>
      </div>

      <AuthForm redirectTo={redirectTo} initialError={oauthError ?? null} />
    </main>
  );
}
