"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Film,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { signOut } from "@/features/auth/actions";

const LINKS = [
  { href: "/admin", label: "대시보드", Icon: LayoutDashboard },
  { href: "/admin/members", label: "회원정보", Icon: Users },
  { href: "/admin/settings", label: "관리자 설정", Icon: ShieldCheck },
  { href: "/admin/exercise-media", label: "운동 영상", Icon: Film },
];

export function AdminNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <nav className="flex gap-2 overflow-x-auto p-3 sm:h-full sm:flex-col sm:gap-1 sm:overflow-visible sm:p-4">
      <div className="mb-2 hidden px-2 sm:block">
        <p className="text-lg font-bold text-zinc-950 dark:text-zinc-100">
          헬쑤 관리자
        </p>
      </div>
      {LINKS.map(({ href, label, Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition sm:w-full",
              active
                ? "bg-emerald-600 text-white"
                : "text-zinc-700 hover:bg-emerald-50 hover:text-emerald-700 dark:text-zinc-300 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400",
            )}
          >
            <Icon aria-hidden="true" size={18} />
            {label}
          </Link>
        );
      })}
      <form action={signOut} className="mt-auto hidden sm:block">
        <button
          type="submit"
          className="inline-flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-zinc-500 transition hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40"
        >
          <LogOut aria-hidden="true" size={18} />
          로그아웃
        </button>
      </form>
    </nav>
  );
}