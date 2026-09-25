import {
  Apple,
  CalendarDays,
  CalendarHeart,
  ChartColumn,
  Flame,
  GraduationCap,
  House,
  ListChecks,
  Newspaper,
  PawPrint,
  Search,
  Target,
  Users,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * 런처형 홈 — 앱 레지스트리 (2026-09-20).
 *
 * 헬쑤를 "앱 하나"가 아니라 **작은 앱 여러 개를 담은 런처**로 본다.
 * 홈은 앱 아이콘 판이고, 앱에 들어가면 화면도 하단 메뉴바도 그 앱 것으로 통째로 바뀐다.
 *
 * 🔴 **가운데(3번째) 칸은 언제나 홈**이다(사용자 결정 2026-09-20).
 * 그래서 각 앱은 `tabs` 에 **양옆 4칸만** 적는다 — 홈은 `bottomTabsForPath()` 가
 * 한가운데에 직접 끼워 넣는다. 앱이 실수로 홈을 빠뜨리는 일이 구조적으로 불가능하다.
 *
 * 🔴 **하단바 4칸은 '입구'일 뿐이고, 기능이 4개라는 뜻이 아니다.**
 * 지금도 `/jog`·`/running`·`/plan/muscle` 은 하단바에 없고 화면 안에서 들어간다 —
 * 그 방식 그대로다. 운동 기능 34개 전수 대조는
 * `docs/ui-launcher-review-2026-09-20.html` 06장 참고.
 */

export type AppTab = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** 이 탭이 활성인지 — 없으면 href 접두사로 판단한다. */
  match?: (pathname: string) => boolean;
};

export type LauncherApp = {
  id: string;
  /** 런처 아이콘 아래 글자 · 앱 안 머리글 제목 */
  label: string;
  icon: LucideIcon;
  /** 런처 타일 배경(Tailwind) — 앱마다 고유색. */
  tone: string;
  /** 아이콘을 눌렀을 때 가는 곳(= 그 앱의 홈). */
  home: string;
  /**
   * 이 앱이 책임지는 경로 접두사. 여기 걸리면 하단바가 이 앱 것으로 바뀐다.
   * 순서가 곧 우선순위 — 먼저 걸리는 앱이 이긴다(`/plan` 이 `/pet` 보다 앞).
   */
  owns: string[];
  /**
   * 양옆 칸 — **그 앱이 실제로 가진 화면만** 적는다(가운데 홈은 여기 넣지 않는다).
   *
   * 🔴 **없는 화면을 만들어 넣지 않는다**(2026-09-21). 예전엔 칸을 4개로 맞추려고
   * `/diet?tab=search` 같은 걸 넣었는데, 그 페이지는 `tab` 을 읽지도 않아서
   * **버튼 4개가 전부 같은 화면**으로 갔다. 화면 안에 이미 있는 탭·버튼과도 겹쳤다.
   *
   * 0·2·4개만 허용한다 — 홈이 언제나 정확히 한가운데 오게(3칸 또는 5칸).
   * **0개면 런처 바를 그대로 쓴다**(화면이 하나뿐인 앱).
   */
  tabs: AppTab[];
  /** 이 디버그 기능이 켜진 사용자에게만 런처에 보인다. */
  debugFlag?: string;
};

/** 가운데 고정석 — 어느 앱에서도 3번째 칸은 이것이다. 앱이 바꿀 수 없다. */
export const HOME_TAB: AppTab = {
  href: "/home",
  label: "홈",
  icon: House,
  match: (p) => p === "/" || p.startsWith("/home"),
};

/** 하단바에 올 수 있는 칸 수 — 양옆 2칸(+홈) 또는 4칸(+홈). */
export const BOTTOM_SLOT_COUNTS = [3, 5] as const;
/** 앱이 가질 수 있는 양옆 칸 수. */
export const SIDE_TAB_COUNTS = [0, 2, 4] as const;
/** 가운데 홈이 들어가는 자리 — 양옆 칸 수의 절반(2칸→1, 4칸→2). */
export function homeSlotIndex(sideTabCount: number): number {
  return sideTabCount / 2;
}

export const LAUNCHER_APPS: LauncherApp[] = [
  { id: "trainer", label: "헬스 트레이너", icon: Users, tone: "bg-gradient-to-br from-teal-400 to-brand", home: "/trainer", owns: ["/trainer"], tabs: [], debugFlag: "trainer-pass" },
  {
    id: "workout",
    label: "운동",
    icon: Flame,
    tone: "bg-gradient-to-br from-orange-400 to-red-500",
    home: "/routine",
    // /plan/* 는 루틴 등록·오늘만 바꾸기·근육별 선택이라 전부 운동 앱이다.
    owns: ["/routine", "/plan", "/exercises", "/conditioning", "/jog", "/running"],
    tabs: [
      {
        href: "/routine",
        label: "오늘",
        icon: Flame,
        match: (p) => p === "/routine" || p.startsWith("/conditioning"),
      },
      {
        href: "/plan",
        label: "루틴",
        icon: ListChecks,
        match: (p) => p.startsWith("/plan") || p.startsWith("/settings/routine"),
      },
      { href: "/exercises", label: "운동찾기", icon: Search },
      {
        href: "/settings/progress",
        label: "기록",
        icon: ChartColumn,
        // 성장 그래프·내 운동 점수 — 설정 깊숙이 묻혀 있던 화면을 1탭으로 꺼낸다.
        match: (p) => p.startsWith("/settings/progress") || p.startsWith("/settings/score"),
      },
    ],
  },
  {
    id: "diet",
    label: "식단",
    icon: Apple,
    tone: "bg-gradient-to-br from-green-400 to-green-600",
    home: "/diet",
    owns: ["/diet"],
    // 화면이 `/diet` 하나뿐이다 — 음식검색·사진기록·영양은 **그 화면 안에 이미 버튼이 있다.**
    // 하단바에 또 넣으면 같은 화면으로 가는 버튼만 넷이 된다.
    tabs: [],
  },
  {
    id: "calendar",
    label: "캘린더",
    icon: CalendarHeart,
    tone: "bg-gradient-to-br from-sky-400 to-blue-600",
    home: "/calendar",
    owns: ["/calendar", "/cycle"],
    tabs: [
      { href: "/calendar", label: "달력", icon: CalendarDays, match: (p) => p.startsWith("/calendar") },
      { href: "/cycle", label: "주기", icon: CalendarHeart },
    ],
  },
  {
    id: "groups",
    label: "그룹",
    icon: UsersRound,
    tone: "bg-gradient-to-br from-amber-400 to-yellow-600",
    home: "/groups",
    owns: ["/groups"],
    // 찾기·랭킹은 `/groups` 화면 안에 있다 — 하단바엔 실제 화면 둘만.
    tabs: [
      { href: "/groups", label: "내 그룹", icon: UsersRound, match: (p) => p === "/groups" },
      { href: "/groups/manage", label: "관리", icon: Users },
    ],
  },
  {
    id: "community",
    label: "커뮤니티",
    icon: Newspaper,
    tone: "bg-gradient-to-br from-violet-400 to-purple-600",
    home: "/community",
    owns: ["/community"],
    // 오운완·운동·내 글 탭은 **화면 위쪽에 이미 있다**(community-board 상단 탭).
    tabs: [],
  },
  {
    id: "coach",
    label: "헬쑤쌤",
    icon: GraduationCap,
    tone: "bg-gradient-to-br from-teal-400 to-cyan-600",
    home: "/coach",
    owns: ["/coach"],
    debugFlag: "helssu-coach",
    // 화면이 `/coach` 하나뿐이다.
    tabs: [],
  },
  {
    id: "pet",
    debugFlag: "pet",
    label: "펫",
    icon: PawPrint,
    tone: "bg-gradient-to-br from-pink-400 to-rose-600",
    home: "/pet",
    owns: ["/pet"],
    tabs: [
      { href: "/pet", label: "펫", icon: PawPrint, match: (p) => p.startsWith("/pet") },
      { href: "/commitments", label: "다짐", icon: Target },
    ],
  },
];

/** 홈 하단 기본 앱 바로가기 — 사용자 편집값이 있으면 교체한다. */
export const LAUNCHER_TABS: AppTab[] = ["workout", "diet", "calendar", "groups"].map(id => {
  const app = LAUNCHER_APPS.find(app => app.id === id)!;
  return { href: app.home, label: app.label, icon: app.icon };
});

/** 홈 위젯으로 요약을 내려 보내는 앱 — 3개 고정(사용자 결정 2026-09-20). */
export const WIDGET_APP_IDS = ["workout", "diet", "calendar"] as const;

/**
 * 경로가 어느 앱에 속하는지. 런처 자신(홈·설정 등)이면 `null`.
 *
 * `owns` 접두사는 **경계까지 본다** — `/plan` 은 `/planner` 에 걸리면 안 된다.
 */
export function appForPath(pathname: string): LauncherApp | null {
  for (const app of LAUNCHER_APPS) {
    for (const prefix of app.owns) {
      if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return app;
    }
  }
  return null;
}

/** 탭이 현재 경로에서 활성인지. */
export function isTabActive(tab: AppTab, pathname: string): boolean {
  if (tab.match) return tab.match(pathname);
  const base = tab.href.split("?")[0];
  return pathname === base || pathname.startsWith(`${base}/`);
}

/**
 * 하단바 5칸 — 현재 경로가 속한 앱의 4칸 사이에 **홈을 한가운데로** 끼워 넣는다.
 * 앱에 속하지 않으면 런처 자신의 4칸을 쓴다.
 */
export function bottomTabsForPath(pathname: string, launcherTabs: readonly AppTab[] = LAUNCHER_TABS): AppTab[] {
  const app = appForPath(pathname);
  // 화면이 하나뿐인 앱(탭 0개)은 런처 바를 그대로 쓴다 — 없는 화면을 만들어 채우지 않는다.
  const side: readonly AppTab[] = app && app.tabs.length > 0 ? app.tabs : launcherTabs;
  const mid = homeSlotIndex(side.length);
  return [...side.slice(0, mid), HOME_TAB, ...side.slice(mid)];
}

/** 런처 격자에 보일 앱들 — 디버그 기능이 꺼져 있으면 그 앱은 빠진다. */
export function visibleApps(enabledFlags: readonly string[] = []): LauncherApp[] {
  return LAUNCHER_APPS.filter((a) => !a.debugFlag || enabledFlags.includes(a.debugFlag));
}
