"use client";

import { useEffect } from "react";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarHeart,
  Flame,
  GraduationCap,
  House,
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
    href: "/home",
    label: "홈",
    icon: House,
    match: (p) => p === "/" || p.startsWith("/home"),
  },
  {
    href: "/routine",
    label: "운동",
    icon: Flame,
    match: (p) => p.startsWith("/routine") || p.startsWith("/plan"),
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
const HIDDEN_PREFIXES = [
  "/login",
  "/onboarding",
  "/admin",
  "/equipment",
  "/running", // 풀스크린 런닝 게임 — 하단탭이 가리지 않게
  "/jog",
];

/**
 * 탭 안쪽 — 아이콘/라벨. useLinkStatus 로 '누른 즉시' 로딩상태를 감지해,
 * 서버 렌더가 끝나기 전에도 스피너 + 활성색을 보여준다(탭 이동이 안 답답하게).
 */
function TabInner({
  Icon,
  label,
  active,
  groupTheme = false,
}: {
  Icon: typeof Flame;
  label: string;
  active: boolean;
  groupTheme?: boolean;
}) {
  const { pending } = useLinkStatus();
  const highlight = active || pending;
  const inactive = groupTheme
    ? "text-amber-950/55 dark:text-zinc-400"
    : "text-zinc-500 dark:text-zinc-400";
  return (
    <span
      // 라벨은 11px 고정 — 앱 전체 최소 글자(12px)의 유일한 예외. 예전엔 좁은 폰에서 9px 까지 줄었다.
      className={`relative flex h-[3.75rem] min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 text-[11px] leading-none transition-colors ${
        highlight ? "font-semibold text-brand" : `font-medium ${inactive}`
      }`}
    >
      {/* 아이폰 탭바처럼 알약 배경 없이 색·굵기만으로 현재 탭을 보여준다. */}
      <span className="flex h-7 min-w-9 items-center justify-center px-2">

        {pending ? (
          <Loader2 aria-hidden="true" size={20} className="animate-spin" />
        ) : (
          <Icon aria-hidden="true" size={20} strokeWidth={highlight ? 2.5 : 2} />
        )}
      </span>
      <span className="max-w-full truncate px-0.5">{label}</span>
    </span>
  );
}

/** 모바일 하단 탭 네비게이션 — 운동/식단/캘린더/그룹(+헬쑤쌤). */
export function BottomNav({
  showCoach = false,
  groupTheme: groupThemeEnabled = true,
}: {
  showCoach?: boolean;
  /** 그룹탭이 헬스장 모드일 때만 앰버 톤 적용(움짤 인증 모드에선 끈다). */
  groupTheme?: boolean;
}) {
  const pathname = usePathname() ?? "/";
  const hidden = HIDDEN_PREFIXES.some((h) => pathname.startsWith(h));
  const tabs = showCoach ? [...TABS, COACH_TAB] : TABS;
  // 그룹 헬스장 화면(정확히 /groups + gym 모드)에선 하단 탭도 헬스장 앰버 톤으로 이어 붙인다.
  const groupTheme = groupThemeEnabled && pathname === "/groups";

  // 고정 바에 콘텐츠가 가리지 않게 body 하단 패딩 확보(보일 때만).
  useEffect(() => {
    if (hidden) return;
    const prev = document.body.style.paddingBottom;
    document.body.style.paddingBottom =
      "calc(3.75rem + env(safe-area-inset-bottom))";
    return () => {
      document.body.style.paddingBottom = prev;
    };
  }, [hidden]);

  if (hidden) return null;

  return (
    <nav
      aria-label="주요 메뉴"
      className={`fixed inset-x-0 bottom-0 z-30 border-t pb-[env(safe-area-inset-bottom)] ${
        groupTheme
          ? "border-amber-950/15 bg-[#f7c07a]/95 backdrop-blur-xl dark:border-amber-800/40 dark:bg-[#5a4326]/95"
          : "app-glass border-black/5 dark:border-white/10"
      }`}
    >
      <ul className="mx-auto flex w-full max-w-xl px-1">
        {tabs.map((t) => {
          const active = t.match(pathname);
          return (
            <li key={t.href} className="min-w-0 flex-1">
              <Link
                href={t.href}
                prefetch={false}
                aria-current={active ? "page" : undefined}
                // 탭을 바꿀 때 짧은 진동(안드로이드). 지원 안 하는 기기에선 아무 일 없음.
                onClick={() => {
                  if (!active) navigator.vibrate?.(8);
                }}
                className="block min-w-0 overflow-hidden transition-transform active:scale-90"
              >
                <TabInner
                  Icon={t.icon}
                  label={t.label}
                  active={active}
                  groupTheme={groupTheme}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
