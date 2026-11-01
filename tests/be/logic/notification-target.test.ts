import { expect, it } from "vitest";
import { notificationTarget } from "@/features/notifications/notification-target";
const origin = "https://health-app-five-iota.vercel.app";
it("moves old admin alerts to the console and preserves their query", () => {
  expect(notificationTarget("/admin/support?status=new", origin)).toBe("https://admin.helthssu.co.kr/admin/health/support?status=new");
});
it("preserves app and console destinations", () => {
  expect(notificationTarget("/routine", origin)).toBe(origin + "/routine");
  const consoleUrl = "https://admin.helthssu.co.kr/admin/health/support";
  expect(notificationTarget(consoleUrl, origin)).toBe(consoleUrl);
});
it.each(["javascript:alert(1)", "https://evil.test/", "https://user@admin.helthssu.co.kr/", "//evil.test/", null])("rejects unsafe target %s", value => {
  expect(notificationTarget(value, origin)).toBeNull();
});

// 2026-11-01 관리자 주소 이전 — 이미 보낸 알림(예전 Vercel 주소)도 계속 연다.
it("keeps old admin console links working", () => {
  const old = "https://heltch-admin.vercel.app/admin/health/support";
  expect(notificationTarget(old, "https://www.helthssu.co.kr")).toBe(old);
});
