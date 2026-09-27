import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { FindPasswordForm } from "@/features/auth/components/find-password-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "비밀번호 찾기",
  robots: { index: false, follow: false },
};

export default function FindPasswordPage() {
  // 공통 머리글(‹ 로그인) + 폼 한 줄기(2026-09-16 8단계) — 로고·설명 문장·아래 '돌아가기' 링크는 머리글이 대신한다.
  return (
    <div className="app-page">
      <PageHeader title="비밀번호 찾기" back="로그인" backHref="/login" />
      <main className="app-container">
        <FindPasswordForm />
      </main>
    </div>
  );
}
