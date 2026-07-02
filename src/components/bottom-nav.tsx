"use client";

import { useEffect } from "react";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarHeart,
  Flame,
  GraduationCap,
  Loader2,
  Newspaper,
  Salad,
  UsersRound,
} from "lucide-react";

type Tab = {
  href: string;
  label: string;
  icon: typeof Flame;
  match: (p: string) => boolean;
};

const TABS: Tab[] = [
  {
    href: "/routine",
    label: "운동",
    icon: Flame,
    match: (p) => p === "/" || p.startsWith("/routine") || p.startsWith("/plan"),
  },
  { href: "/diet", label: "식단", icon: Salad, match: (p) => p.startsWith("/diet") },
  {
    href: "/calendar",
    label: "캘린더",
    icon: CalendarHeart,
    match: (p) => p.startsWith("/calendar"),
  },
  {
    href: "/groups",
    label: "그룹",
    icon: UsersRound,
    match: (p) => p.startsWith("/groups"),
  },
  {
    href: "/community",
    label: "커뮤니티",
    icon: Newspaper,
    match: (p) => p.startsWith("/community"),
  },
];

// 헬쑤쌤(AI 코치) 탭 — 디버그 기능이 켜진 사용자에게만 그룹 옆에 추가된다.
const COACH_TAB: Tab = {
  href: "/coach",
  label: "헬쑤쌤",
  icon: GraduationCap,
  match: (p) => p.startsWith("/coach"),
};

// 로그인/온보딩 등 앱 외 화면 + 관리자 전용 화면(관리자 콘솔·기구분석)에선 숨긴다.
// (관리자 계정은 이 화면들에서 활동하고, 관리자 콘솔엔 자체 사이드 네비가 있어 하단탭이 방해된다.)
const HIDDEN_PREFIXES = ["/login", "/onboarding", "/admin", "/equipment"];

/**
 * 탭 안쪽 — 아이콘/라벨. useLinkStatus 로 '누른 즉시' 로딩상태를 감지해,
 * 서버 렌더가 끝나기 전에도 스피너 + 활성색을 보여준다(탭 이동이 안 답답하게).
 */
function TabInner({
  Icon,
  label,
  active,
}: {
  Icon: typeof Flame;
  label: string;
  active: boolean;
}) {
  const { pending } = useLinkStatus();
  const highlight = active || pending;
  return (
    <span
      className={`flex h-16 flex-col items-center justify-center gap-0.5 text-[11px] font-bold transition-colors ${
        highlight
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-zinc-500 dark:text-zinc-400"
      }`}
    >
      {pending ? (
        <Loader2 aria-hidden="true" size={22} className="animate-spin" />
      ) : (
        <Icon aria-hidden="true" size={22} />
      )}
      {label}
    </span>
  );
}

/** 모바일 하단 탭 네비게이션 — 운동/식단/캘린더/그룹(+헬쑤쌤). */
export function BottomNav({ showCoach = false }: { showCoach?: boolean }) {
  const pathname = usePathname() ?? "/";
  const hidden = HIDDEN_PREFIXES.some((h) => pathname.startsWith(h));
  const tabs = showCoach ? [...TABS, COACH_TAB] : TABS;

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
        {tabs.map((t) => {
          const active = t.match(pathname);
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className="block active:scale-95 transition-transform"
              >
                <TabInner Icon={t.icon} label={t.label} active={active} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
