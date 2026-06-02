import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { getAdmins, isAdminUser } from "@/features/admin/admin";
import { AdminSettingsManager } from "@/features/admin/components/admin-settings-manager";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  if (!(await isAdminUser())) notFound();
  const admins = await getAdmins();

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10 sm:px-8">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-200"
      >
        <ChevronLeft aria-hidden="true" size={16} />
        관리자
      </Link>
      <h1 className="mt-6 mb-1 text-2xl font-bold text-zinc-950 dark:text-zinc-100">
        관리자 설정
      </h1>
      <p className="mb-6 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        회원의 이메일을 입력해 관리자로 지정할 수 있습니다. 관리자로 지정된
        계정은 일반 화면 대신 이 관리자 콘솔로 이동합니다.
      </p>
      <AdminSettingsManager admins={admins} />
    </main>
  );
}
