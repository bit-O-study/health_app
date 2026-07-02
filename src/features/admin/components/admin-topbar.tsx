"use client";

import { usePathname } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { adminPageTitle } from "@/features/admin/admin-nav-model";

/** 데스크톱 대시보드 상단바 — 현재 섹션 제목 + 관리자 배지(ERP 느낌). 모바일에선 숨김. */
export function AdminTopbar() {
  const pathname = usePathname() ?? "/admin";
  return (
    <header className="sticky top-0 z-20 hidden h-14 items-center justify-between border-b border-zinc-200 bg-white/80 px-6 backdrop-blur lg:flex dark:border-zinc-700 dark:bg-zinc-900/80">
      <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
        {adminPageTitle(pathname)}
      </h1>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
        <ShieldCheck aria-hidden="true" size={14} />
        관리자
      </span>
    </header>
  );
}
