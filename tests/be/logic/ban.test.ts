import { describe, expect, it } from "vitest";

import { banStateOf, isBlocked } from "@/features/admin/ban";

const now = new Date("2026-06-02T12:00:00Z");
const future = new Date("2026-06-09T12:00:00Z").toISOString();
const past = new Date("2026-05-26T12:00:00Z").toISOString();

describe("ban (회원 정지/영구정지 상태)", () => {
  it("정지·차단 없으면 active", () => {
    expect(banStateOf({ suspendedUntil: null, bannedAt: null }, now)).toBe("active");
    expect(isBlocked({ suspendedUntil: null, bannedAt: null }, now)).toBe(false);
  });

  it("banned_at 있으면 영구정지(banned)", () => {
    expect(banStateOf({ suspendedUntil: null, bannedAt: past }, now)).toBe("banned");
    expect(isBlocked({ suspendedUntil: null, bannedAt: past }, now)).toBe(true);
  });

  it("suspended_until 이 미래면 기간정지(suspended)", () => {
    expect(banStateOf({ suspendedUntil: future, bannedAt: null }, now)).toBe("suspended");
    expect(isBlocked({ suspendedUntil: future, bannedAt: null }, now)).toBe(true);
  });

  it("suspended_until 이 과거면 자동 해제(active)", () => {
    expect(banStateOf({ suspendedUntil: past, bannedAt: null }, now)).toBe("active");
    expect(isBlocked({ suspendedUntil: past, bannedAt: null }, now)).toBe(false);
  });

  it("영구정지가 기간정지보다 우선", () => {
    expect(banStateOf({ suspendedUntil: future, bannedAt: past }, now)).toBe("banned");
  });
});
