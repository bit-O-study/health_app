import Link from "next/link";
import { redirect } from "next/navigation";
import { Dumbbell } from "lucide-react";

import { AuthForm } from "@/features/auth/components/auth-form";
import { getCurrentUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect: redirectParam } = await searchParams;
  const redirectTo =
    redirectParam && redirectParam.startsWith("/") ? redirectParam : "/";

  const user = await getCurrentUser();
  if (user) {
    redirect(redirectTo);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-zinc-50 px-6 py-12">
      <Link className="flex items-center gap-2" href="/">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white">
          <Dumbbell aria-hidden="true" size={22} />
        </span>
        <span className="text-lg font-bold tracking-tight text-zinc-950">
          HELTCH
        </span>
      </Link>

      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold text-zinc-950">
          로그인하고 내 루틴 시작하기
        </h1>
        <p className="max-w-sm text-sm leading-6 text-zinc-600">
          회원별로 루틴을 저장하면 매일 그날 해야 할 운동을 메인에서 바로
          확인할 수 있습니다.
        </p>
      </div>

      <AuthForm redirectTo={redirectTo} />

      <Link
        className="text-sm font-semibold text-zinc-500 transition hover:text-zinc-800"
        href="/exercises"
      >
        먼저 운동 리스트 둘러보기
      </Link>
    </main>
  );
}