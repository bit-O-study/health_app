"use client";

import { useEffect } from "react";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { Loader2, Plus } from "lucide-react";

import {
  HOME_TAB,
  visibleApps,
  bottomTabsForPath,
  isTabActive,
  type AppTab,
} from "@/features/launcher/apps";

import { useHomeDock } from "@/features/launcher/use-home-dock";

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
  Icon: AppTab["icon"];
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
      {/* 현재 탭은 색·굵기와 아이콘 배경으로 구분한다. */}
      <span className={`flex h-7 min-w-9 items-center justify-center rounded-lg px-2 ${highlight ? "bg-brand/10" : ""}`}>

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

/**
 * 가운데 고정석 — 어느 앱에서도 3번째 칸은 홈이다(사용자 결정 2026-09-20).
 *
 * 옆 4칸과 **모양부터 다르게** 한다(원형 + 브랜드색 + 살짝 솟음). 앱을 옮겨 다니면
 * 양옆 메뉴는 통째로 갈리는데, 이 칸만은 자리도 생김새도 그대로여서 "돌아갈 곳"이
 * 늘 같은 좌표에 있다.
 */
function HomeTabInner({ active }: { active: boolean }) {
  const { pending } = useLinkStatus();
  const Icon = HOME_TAB.icon;
  return (
    <span className="relative flex h-[3.75rem] min-w-0 flex-col items-center justify-end gap-0.5 pb-[0.4rem] text-[11px] font-semibold leading-none text-brand">
      <span className="absolute -top-3.5 flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-white bg-brand text-white shadow-lg shadow-brand/40 dark:border-zinc-900">
        {pending ? (
          <Loader2 aria-hidden="true" size={21} className="animate-spin" />
        ) : (
          <Icon aria-hidden="true" size={21} strokeWidth={active ? 2.6 : 2.2} />
        )}
      </span>
      <span className="max-w-full truncate px-0.5">{HOME_TAB.label}</span>
    </span>
  );
}

/**
 * 모바일 하단 탭 네비게이션 — **앱마다 바뀌는 4칸 + 가운데 고정 홈**(2026-09-20).
 *
 * 예전엔 전 화면 동일한 6칸(홈·운동·식단·캘린더·그룹·커뮤니티)이었다. 기능이 늘수록
 * 6칸 자리싸움이 됐고, 하단바에 못 들어간 기능은 링크를 찾아 들어가야 했다.
 * 지금은 홈이 앱 런처 역할을 하고, 하단바는 **지금 있는 앱의 메뉴**를 보여준다.
 * 어느 칸을 보여줄지는 `@/features/launcher/apps` 한 곳이 정한다.
 */
export function BottomNav({
  groupTheme: groupThemeEnabled = true,
  userId = "",
  enabledFlags = [],
}: {
  /** 그룹탭이 헬스장 모드일 때만 앰버 톤 적용(움짤 인증 모드에선 끈다). */
  groupTheme?: boolean;
  userId?: string;
  enabledFlags?: readonly string[];
}) {
  const pathname = usePathname() ?? "/";
  const hidden = HIDDEN_PREFIXES.some((h) => pathname.startsWith(h));
  const { ids } = useHomeDock(userId);
  const available = visibleApps(enabledFlags);
  const dockTabs = ids.map((id, index): AppTab => {
    const app = available.find(app => app.id === id);
    return app ? { href: app.home, label: app.label, icon: app.icon } : {
      href: "/home?edit=apps&slot=" + index + "#home-apps", label: "앱 추가", icon: Plus, match: () => false,
    };
  });
  const tabs = bottomTabsForPath(pathname, dockTabs);
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
      <ul className="mx-auto flex w-full max-w-3xl px-1 sm:px-6">
        {tabs.map((t) => {
          const active = isTabActive(t, pathname);
          const isHome = t.href === HOME_TAB.href;
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
                // 가운데 홈은 바 위로 솟기 때문에 잘라내면 안 된다(overflow-hidden 금지).
                className={`block min-w-0 transition-transform active:scale-90 ${
                  isHome ? "overflow-visible" : "overflow-hidden"
                }`}
              >
                {isHome ? (
                  <HomeTabInner active={active} />
                ) : (
                  <TabInner
                    Icon={t.icon}
                    label={t.label}
                    active={active}
                    groupTheme={groupTheme}
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
