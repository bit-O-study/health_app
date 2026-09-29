import { expect, it } from "vitest";
import { notificationTarget } from "@/features/notifications/notification-target";
const origin = "https://health-app-five-iota.vercel.app";
it("moves old admin alerts to the console and preserves their query", () => {
  expect(notificationTarget("/admin/support?status=new", origin)).toBe("https://heltch-admin.vercel.app/admin/health/support?status=new");
});
it("preserves app and console destinations", () => {
  expect(notificationTarget("/routine", origin)).toBe(origin + "/routine");
  const consoleUrl = "https://heltch-admin.vercel.app/admin/health/support";
  expect(notificationTarget(consoleUrl, origin)).toBe(consoleUrl);
});
it.each(["javascript:alert(1)", "https://evil.test/", "https://user@heltch-admin.vercel.app/", "//evil.test/", null])("rejects unsafe target %s", value => {
  expect(notificationTarget(value, origin)).toBeNull();
});
