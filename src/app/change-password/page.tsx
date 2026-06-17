import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Logo } from "@/features/brand/logo";
import { ChangePasswordForm } from "@/features/auth/components/change-password-form";
import { getCurrentUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "비밀번호 변경",
  robots: { index: false, follow: false },
};

export default async function ChangePasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/change-password");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-zinc-50 dark:bg-zinc-900 px-6 py-12">
      <Logo size={44} wordClassName="text-lg" />
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-100">
          새 비밀번호로 변경
        </h1>
        <p className="max-w-sm text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          임시 비밀번호로 로그인하셨습니다. 계속 이용하려면 새 비밀번호로 변경해
          주세요.
        </p>
      </div>
      <ChangePasswordForm redirectTo="/" />
    </main>
  );
}
