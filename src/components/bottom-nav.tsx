"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dumbbell, ListChecks, Settings, Utensils } from "lucide-react";

type Tab = {
  href: string;
  label: string;
  icon: typeof Dumbbell;
  match: (p: string) => boolean;
};

const TABS: Tab[] = [
  {
    href: "/routine",
    label: "운동",
    icon: Dumbbell,
    match: (p) => p === "/" || p.startsWith("/routine") || p.startsWith("/plan"),
  },
  { href: "/diet", label: "식단", icon: Utensils, match: (p) => p.startsWith("/diet") },
  {
    href: "/exercises",
    label: "운동목록",
    icon: ListChecks,
    match: (p) => p.startsWith("/exercises"),
  },
  {
    href: "/settings",
    label: "설정",
    icon: Settings,
    match: (p) => p.startsWith("/settings"),
  },
];

// 로그인/온보딩 등 앱 외 화면에선 숨긴다.
const HIDDEN_PREFIXES = ["/login", "/onboarding"];

/** 모바일 하단 탭 네비게이션 — 운동/식단/운동목록/설정. */
export function BottomNav() {
  const pathname = usePathname() ?? "/";
  const hidden = HIDDEN_PREFIXES.some((h) => pathname.startsWith(h));

  // 고정 바에 콘텐츠가 가리지 않게 body 하단 패딩 확보(보일 때만).
  useEffect(() => {
    if (hidden) return;
    const prev = document.body.style.paddingBottom;
    document.body.style.paddingBottom =
      "calc(4rem + env(safe-area-inset-bottom))";
    return () => {
      document.body.style.paddingBottom = prev;
    };
  }, [hidden]);

  if (hidden) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
      <ul className="mx-auto flex w-full max-w-2xl">
        {TABS.map((t) => {
          const active = t.match(pathname);
          const Icon = t.icon;
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-16 flex-col items-center justify-center gap-0.5 text-[11px] font-bold transition ${
                  active
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                <Icon aria-hidden="true" size={22} />
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
