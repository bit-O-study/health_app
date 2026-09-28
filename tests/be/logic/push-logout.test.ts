import { afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ remove: vi.fn(), native: vi.fn(), unsubscribe: vi.fn() }));
vi.mock("@/features/notifications/push-actions", () => ({ deletePushSubscriptionAction:mocks.remove, savePushSubscriptionAction:vi.fn() }));
vi.mock("@/features/notifications/native-push", () => ({ unregisterNativePush:mocks.native }));
import { detachPushForLogout } from "@/features/notifications/push-client";
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });
describe("device push logout", () => {
  it("removes the current endpoint before invalidating the browser subscription", async () => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("navigator", {serviceWorker:{getRegistration:async()=>({pushManager:{getSubscription:async()=>({endpoint:"https://push.example/device-a",unsubscribe:mocks.unsubscribe})}})}});
    mocks.remove.mockResolvedValue({ok:true});
    await detachPushForLogout();
    expect(mocks.remove).toHaveBeenCalledWith("https://push.example/device-a");
    expect(mocks.unsubscribe).toHaveBeenCalledOnce();
    expect(mocks.native).toHaveBeenCalledOnce();
    expect(mocks.remove.mock.invocationCallOrder[0]).toBeLessThan(mocks.unsubscribe.mock.invocationCallOrder[0]);
  });
  it("does not silently drop auth when server detachment fails", async () => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("navigator", {serviceWorker:{getRegistration:async()=>({pushManager:{getSubscription:async()=>({endpoint:"current",unsubscribe:mocks.unsubscribe})}})}});
    mocks.remove.mockResolvedValue({ok:false});
    await expect(detachPushForLogout()).rejects.toThrow();
    expect(mocks.unsubscribe).not.toHaveBeenCalled();
  });
  it("supports devices without a web push subscription", async () => {
    vi.stubGlobal("window", {}); vi.stubGlobal("navigator", {});
    await detachPushForLogout();
    expect(mocks.native).toHaveBeenCalledOnce();
    expect(mocks.remove).not.toHaveBeenCalled();
  });
});
