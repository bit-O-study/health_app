import { describe, expect, it } from "vitest";

import {
  ADMIN_LINKS,
  ADMIN_SECTIONS,
  adminPageTitle,
  isAdminLinkActive,
} from "@/features/admin/admin-nav-model";

describe("admin nav model", () => {
  it("flattens sections into links with unique hrefs", () => {
    const hrefs = ADMIN_LINKS.map((l) => l.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(ADMIN_LINKS.length).toBe(
      ADMIN_SECTIONS.reduce((n, s) => n + s.links.length, 0),
    );
  });
});

describe("isAdminLinkActive", () => {
  it("matches /admin only exactly (not sub-routes)", () => {
    expect(isAdminLinkActive("/admin", "/admin")).toBe(true);
    expect(isAdminLinkActive("/admin", "/admin/members")).toBe(false);
  });
  it("matches sub-routes by prefix", () => {
    expect(isAdminLinkActive("/admin/members", "/admin/members")).toBe(true);
    expect(isAdminLinkActive("/admin/members", "/admin/members/123")).toBe(true);
    expect(isAdminLinkActive("/admin/settings", "/admin/members")).toBe(false);
  });
});

describe("adminPageTitle", () => {
  it("returns dashboard label at /admin", () => {
    expect(adminPageTitle("/admin")).toBe("대시보드");
  });
  it("returns the most specific label for sub-routes", () => {
    expect(adminPageTitle("/admin/members")).toBe("회원정보");
    expect(adminPageTitle("/admin/settings")).toBe("관리자 설정");
    expect(adminPageTitle("/equipment")).toBe("기구 분석");
  });
  it("falls back to 관리자 for unknown paths", () => {
    expect(adminPageTitle("/nowhere")).toBe("관리자");
  });
});
