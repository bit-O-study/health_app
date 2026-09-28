import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ detach: vi.fn(), unregister: vi.fn(), listeners: vi.fn(), get: vi.fn(), remove: vi.fn() }));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => true } }));
vi.mock("@capacitor/push-notifications", () => ({ PushNotifications: { unregister: mocks.unregister, removeAllListeners: mocks.listeners } }));
vi.mock("@/features/notifications/push-actions", () => ({ deleteFcmTokenAction: mocks.detach, saveFcmTokenAction: vi.fn() }));
import { unregisterNativePush } from "@/features/notifications/native-push";
beforeEach(() => {
  vi.clearAllMocks(); vi.stubGlobal("window", {});
  vi.stubGlobal("localStorage", { getItem: mocks.get, removeItem: mocks.remove });
  mocks.get.mockReturnValue("this-device-token"); mocks.detach.mockResolvedValue({ ok: true });
});
afterEach(() => vi.unstubAllGlobals());
describe("native logout", () => {
  it("detaches only the saved device token before unregistering", async () => {
    await unregisterNativePush();
    expect(mocks.detach).toHaveBeenCalledWith("this-device-token");
    expect(mocks.detach.mock.invocationCallOrder[0]).toBeLessThan(mocks.unregister.mock.invocationCallOrder[0]);
    expect(mocks.remove).toHaveBeenCalledWith("helssu:device-push-token");
  });
  it("keeps the token for retry if server removal fails", async () => {
    mocks.detach.mockResolvedValue({ ok: false });
    await expect(unregisterNativePush()).rejects.toThrow();
    expect(mocks.unregister).not.toHaveBeenCalled(); expect(mocks.remove).not.toHaveBeenCalled();
  });
});
