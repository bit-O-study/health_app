"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Camera,
  Clock,
  Dumbbell,
  Film,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { signOut } from "@/features/auth/actions";
import {
  ADMIN_SECTIONS,
  isAdminLinkActive,
} from "@/features/admin/admin-nav-model";

/** href → 아이콘 매핑(구조는 순수 모듈, 아이콘만 여기서). */
const ICONS: Record<string, LucideIcon> = {
  "/admin": LayoutDashboard,
  "/admin/members": Users,
  "/admin/crons": Clock,
  "/admin/settings": ShieldCheck,
  "/admin/exercise-media": Film,
  "/equipment": Camera,
  "/admin/test": FlaskConical,
};

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-2 overflow-x-auto p-3 lg:h-full lg:flex-col lg:items-stretch lg:gap-1 lg:overflow-visible lg:p-4">
      {/* 브랜드 — 데스크톱 사이드바 상단에만 */}
      <div className="mb-4 hidden items-center gap-2 px-2 lg:flex">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
          <Dumbbell aria-hidden="true" size={18} />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-bold text-zinc-950 dark:text-zinc-100">
            헬쑤 관리자
          </p>
          <p className="text-[11px] text-zinc-500">admin console</p>
        </div>
      </div>

      {ADMIN_SECTIONS.map((section) => (
        // 모바일에선 섹션 제목을 숨기고 링크만 가로로 흐르게(현재와 동일).
        <div
          key={section.title}
          className="flex items-center gap-2 lg:mt-2 lg:flex-col lg:items-stretch lg:gap-1"
        >
          <p className="hidden px-2 pb-1 text-[11px] font-bold uppercase tracking-wide text-zinc-400 lg:block">
            {section.title}
          </p>
          {section.links.map((link) => {
            const Icon = ICONS[link.href] ?? LayoutDashboard;
            const active = isAdminLinkActive(link.href, pathname);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition lg:w-full",
                  active
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-zinc-700 hover:bg-emerald-50 hover:text-emerald-700 dark:text-zinc-300 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400",
                )}
              >
                <Icon aria-hidden="true" size={18} />
                {link.label}
              </Link>
            );
          })}
        </div>
      ))}

      {/* 로그아웃 — 모바일 가로 끝 / 데스크톱 사이드바 맨 아래 */}
      <form action={signOut} className="shrink-0 lg:mt-auto lg:w-full lg:pt-2">
        <button
          type="submit"
          className="inline-flex w-full items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold text-zinc-500 transition hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40"
        >
          <LogOut aria-hidden="true" size={18} />
          로그아웃
        </button>
      </form>
    </nav>
  );
}
