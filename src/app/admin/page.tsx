import Link from "next/link";
import { notFound } from "next/navigation";
import { Users, ShieldCheck, Film } from "lucide-react";

import { isAdminUser } from "@/features/admin/admin";
import { signOut } from "@/features/auth/actions";

export const dynamic = "force-dynamic";

const CARDS = [
  {
    href: "/admin/members",
    title: "회원정보",
    desc: "가입 회원 프로필(성별·경력·체중·가입일) 조회",
    Icon: Users,
  },
  {
    href: "/admin/settings",
    title: "관리자 설정",
    desc: "관리자 계정 추가/해제 (회원 이메일로 지정)",
    Icon: ShieldCheck,
  },
  {
    href: "/admin/exercise-media",
    title: "운동 영상 설정",
    desc: "운동별 시범 영상/움짤 URL 등록 — 전 사용자에게 표시",
    Icon: Film,
  },
];

export default async function AdminHomePage() {
  if (!(await isAdminUser())) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10 sm:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-100">
            관리자
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            헬포유 운영 관리 콘솔
          </p>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="text-sm font-semibold text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            로그아웃
          </button>
        </form>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {CARDS.map(({ href, title, desc, Icon }) => (
          <Link
            key={href}
            href={href}
            className="group rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-5 shadow-sm transition hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400">
              <Icon aria-hidden="true" size={22} />
            </span>
            <h2 className="mt-3 text-lg font-bold text-zinc-950 dark:text-zinc-100">
              {title}
            </h2>
            <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              {desc}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
