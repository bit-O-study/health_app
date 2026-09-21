import {
  Apple,
  Bell,
  Camera,
  CalendarDays,
  CalendarHeart,
  ChartColumn,
  ChartLine,
  Flame,
  GraduationCap,
  House,
  ListChecks,
  Newspaper,
  NotebookPen,
  PawPrint,
  Scale,
  Search,
  Settings,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  UserRound,
  Users,
  UsersRound,
  Utensils,
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
  /** 양옆 4칸. 가운데 홈은 여기 넣지 않는다. */
  tabs: [AppTab, AppTab, AppTab, AppTab];
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

/** 하단바 칸 수 — 양옆 4 + 가운데 홈 1. */
export const BOTTOM_SLOT_COUNT = 5;
/** 가운데 홈이 들어가는 자리(0-based). */
export const HOME_SLOT_INDEX = 2;

export const LAUNCHER_APPS: LauncherApp[] = [
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
    tabs: [
      { href: "/diet", label: "오늘", icon: Utensils, match: (p) => p === "/diet" },
      { href: "/diet?tab=search", label: "음식검색", icon: Search },
      { href: "/diet?tab=photo", label: "사진기록", icon: Camera },
      { href: "/diet?tab=nutrition", label: "영양", icon: ChartLine },
    ],
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
      { href: "/settings/history", label: "지난 기록", icon: NotebookPen },
      { href: "/settings/score", label: "통계", icon: TrendingUp },
    ],
  },
  {
    id: "groups",
    label: "그룹",
    icon: UsersRound,
    tone: "bg-gradient-to-br from-amber-400 to-yellow-600",
    home: "/groups",
    owns: ["/groups"],
    tabs: [
      { href: "/groups", label: "내 그룹", icon: UsersRound, match: (p) => p === "/groups" },
      { href: "/groups?tab=find", label: "찾기", icon: Search },
      { href: "/groups?tab=rank", label: "랭킹", icon: Trophy },
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
    tabs: [
      { href: "/community", label: "피드", icon: Newspaper, match: (p) => p === "/community" },
      { href: "/community?sort=hot", label: "인기", icon: Sparkles },
      { href: "/community?write=1", label: "글쓰기", icon: NotebookPen },
      { href: "/community?mine=1", label: "내 글", icon: UserRound },
    ],
  },
  {
    id: "coach",
    label: "헬쑤쌤",
    icon: GraduationCap,
    tone: "bg-gradient-to-br from-teal-400 to-cyan-600",
    home: "/coach",
    owns: ["/coach"],
    debugFlag: "helssu-coach",
    tabs: [
      { href: "/coach", label: "대화", icon: GraduationCap, match: (p) => p === "/coach" },
      { href: "/coach?tab=plan", label: "추천", icon: Sparkles },
      { href: "/coach?tab=report", label: "분석", icon: ChartColumn },
      { href: "/settings", label: "설정", icon: Settings },
    ],
  },
  {
    id: "pet",
    label: "펫",
    icon: PawPrint,
    tone: "bg-gradient-to-br from-pink-400 to-rose-600",
    home: "/pet",
    owns: ["/pet", "/commitments"],
    tabs: [
      { href: "/pet", label: "펫", icon: PawPrint, match: (p) => p.startsWith("/pet") },
      { href: "/commitments", label: "다짐", icon: Target },
      { href: "/settings/score", label: "보상", icon: Trophy },
      // 🔴 여기에 /calendar 를 두면 캘린더 앱으로 넘어가 하단바가 통째로 갈린다.
      { href: "/settings/history", label: "기록", icon: NotebookPen },
    ],
  },
];

/**
 * 런처(홈) 자신의 4칸 — 어느 앱에도 속하지 않는 화면에서 쓰인다.
 *
 * 🔴 **런처 칸은 런처가 소유한 경로만 가리킨다**(2026-09-21).
 * 예전엔 '검색'이 `/exercises` 를 가리켰는데, 거기는 운동 앱 땅이라 누르는 순간
 * 하단바가 운동 앱 것으로 통째로 갈렸다 — 런처에서 눌렀는데 남의 앱 안에 들어가
 * 있는 꼴이라 "눌러도 엉뚱한 화면이 나온다"로 느껴졌다.
 * 운동 종목 찾기는 운동 앱의 '운동찾기' 칸이 담당한다.
 */
export const LAUNCHER_TABS: [AppTab, AppTab, AppTab, AppTab] = [
  { href: "/settings/body-composition", label: "체형", icon: Scale },
  { href: "/settings/progress", label: "기록", icon: TrendingUp },
  { href: "/settings/notifications", label: "알림", icon: Bell },
  { href: "/settings", label: "나", icon: UserRound, match: (p) => p.startsWith("/settings") || p.startsWith("/account") },
];

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
export function bottomTabsForPath(pathname: string): AppTab[] {
  const app = appForPath(pathname);
  const side = app ? app.tabs : LAUNCHER_TABS;
  return [...side.slice(0, HOME_SLOT_INDEX), HOME_TAB, ...side.slice(HOME_SLOT_INDEX)];
}

/** 런처 격자에 보일 앱들 — 디버그 기능이 꺼져 있으면 그 앱은 빠진다. */
export function visibleApps(enabledFlags: readonly string[] = []): LauncherApp[] {
  return LAUNCHER_APPS.filter((a) => !a.debugFlag || enabledFlags.includes(a.debugFlag));
}
