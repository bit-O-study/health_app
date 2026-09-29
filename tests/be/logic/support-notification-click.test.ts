import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { expect, it, vi } from "vitest";

function worker() {
  const handlers: Record<string, (event: unknown) => void> = {};
  const window = { url: "https://health.test/home", navigate: vi.fn().mockResolvedValue(undefined), focus: vi.fn() };
  const clients = { matchAll: vi.fn().mockResolvedValue([window]), openWindow: vi.fn() };
  runInNewContext(readFileSync("public/sw.js", "utf8"), {
    URL, importScripts: () => {},
    self: { swStrategy: {}, location: { origin: "https://health.test" }, clients, addEventListener: (name: string, fn: (event: unknown) => void) => { handlers[name] = fn; } },
  });
  async function click(url: string) {
    let pending: Promise<unknown> | undefined;
    handlers.notificationclick({ notification: { data: { type: "support", url }, close: vi.fn() }, waitUntil: (p: Promise<unknown>) => { pending = p; } });
    await pending;
  }
  return { click, clients, window };
}
it("opens console in the browser even when the health app is already open", async () => {
  const w = worker(); const target = "https://heltch-admin.vercel.app/admin/health/support";
  await w.click(target);
  expect(w.clients.openWindow).toHaveBeenCalledWith(target);
  expect(w.window.navigate).not.toHaveBeenCalled(); expect(w.window.focus).not.toHaveBeenCalled();
});
it("old messages also open the console", async () => {
  const w = worker(); await w.click("/admin/support?status=new");
  expect(w.clients.openWindow).toHaveBeenCalledWith("https://heltch-admin.vercel.app/admin/health/support?status=new");
});
it("opens a new window if app navigation fails", async () => {
  const w = worker(); w.window.navigate.mockRejectedValue(new Error("closed"));
  await w.click("/routine"); expect(w.clients.openWindow).toHaveBeenCalledWith("https://health.test/routine");
});
it("rejects untrusted destinations", async () => {
  const w = worker(); await w.click("https://evil.test/"); expect(w.clients.openWindow).not.toHaveBeenCalled();
});
