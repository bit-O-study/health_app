/**
 * 관리자 콘솔 네비게이션 구조 — 순수 모듈(아이콘/JSX 없음 → 단위 테스트 가능).
 * 아이콘은 admin-nav.tsx 에서 href 로 매핑한다.
 */

export type AdminLink = { href: string; label: string };
export type AdminSection = { title: string; links: AdminLink[] };

export const ADMIN_SECTIONS: AdminSection[] = [
  {
    title: "관리",
    links: [
      { href: "/admin", label: "대시보드" },
      { href: "/admin/members", label: "회원정보" },
      { href: "/admin/settings", label: "관리자 설정" },
    ],
  },
  {
    title: "콘텐츠",
    links: [{ href: "/admin/exercise-media", label: "운동 영상" }],
  },
  {
    title: "도구",
    links: [
      { href: "/equipment", label: "기구 분석" },
      { href: "/admin/test", label: "테스트" },
    ],
  },
];

export const ADMIN_LINKS: AdminLink[] = ADMIN_SECTIONS.flatMap((s) => s.links);

/** 현재 경로가 이 링크에 해당하나 — "/admin" 은 정확히, 나머지는 접두사. */
export function isAdminLinkActive(href: string, pathname: string): boolean {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

/** 상단바 제목 — 현재 경로에 맞는(가장 구체적인) 링크 라벨. 없으면 "관리자". */
export function adminPageTitle(pathname: string): string {
  const match = ADMIN_LINKS.filter((l) => isAdminLinkActive(l.href, pathname)).sort(
    (a, b) => b.href.length - a.href.length,
  )[0];
  return match?.label ?? "관리자";
}
