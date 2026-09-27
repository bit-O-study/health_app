import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { ChangePasswordForm } from "@/features/auth/components/change-password-form";
import { getCurrentUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "비밀번호 변경",
  robots: { index: false, follow: false },
};

// 임시 비밀번호 로그인 뒤 강제로 오는 화면이라 '뒤로'는 두지 않는다.
// 공통 머리글 + 한 줄 안내 + 폼 한 장(2026-09-16 8단계).
export default async function ChangePasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/change-password");

  return (
    <div className="app-page">
      <PageHeader title="새 비밀번호로 변경" />
      <main className="app-container space-y-3">
        <p className="px-1 text-sm text-zinc-500 dark:text-zinc-400">
          임시 비밀번호로 로그인했어요. 새 비밀번호로 바꿔 주세요.
        </p>
        <ChangePasswordForm redirectTo="/" />
      </main>
    </div>
  );
}
