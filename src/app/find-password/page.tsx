import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/features/brand/logo";
import { FindPasswordForm } from "@/features/auth/components/find-password-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "비밀번호 찾기",
  robots: { index: false, follow: false },
};

export default function FindPasswordPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-zinc-50 dark:bg-zinc-900 px-6 py-12">
      <Link className="flex items-center" href="/">
        <Logo size={44} wordClassName="text-lg" />
      </Link>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-100">
          비밀번호 찾기
        </h1>
        <p className="max-w-sm text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          아이디(이메일)와 휴대폰 번호 확인 후, 이메일로 받은 인증번호를 입력하고
          새 비밀번호를 설정하세요.
        </p>
      </div>
      <FindPasswordForm />
      <Link
        className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 transition hover:text-zinc-800 dark:hover:text-zinc-200"
        href="/login"
      >
        로그인으로 돌아가기
      </Link>
    </main>
  );
}
