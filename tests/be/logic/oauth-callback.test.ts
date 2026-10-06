import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ exchange: vi.fn(), sync: vi.fn(), destination: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({ auth: { exchangeCodeForSession: mocks.exchange } }) }));
vi.mock("@/features/auth/actions", () => ({ destinationAfterLogin: mocks.destination }));
vi.mock("@/features/auth/sync-social-name", () => ({ syncSocialProfileName: mocks.sync }));
import { GET } from "@/app/auth/callback/route";

const origin = "https://health-app-five-iota.vercel.app";
function request(query: string, native = false) {
  return new Request(origin + "/auth/callback?" + query, { headers: { "user-agent": native ? "Mozilla/5.0 helssu-app" : "Mozilla/5.0 Chrome" } });
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.exchange.mockResolvedValue({ error: null });
  mocks.destination.mockImplementation(async (next: string) => next);
});
describe("OAuth app return", () => {
  it("processes HTTPS App Link inside the app without reopening it", async () => {
    const response = await GET(request("native=1&code=app-code&next=%2Fplan", true));
    expect(mocks.exchange).toHaveBeenCalledExactlyOnceWith("app-code");
    expect(mocks.sync).toHaveBeenCalledOnce();
    expect(response.headers.get("location")).toBe(origin + "/plan");
  });
  it("offers automatic and manual return without exchanging in the browser", async () => {
    const response = await GET(request("native=1&code=app-code&next=%2Fplan"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    const html = await response.text();
    expect(html).toContain("helssu://auth/callback?code=app-code&amp;next=%2Fplan");
    expect(html).toContain("헬쑤 앱으로 돌아가기");
    expect(html).toContain("window.location.replace");
    expect(mocks.exchange).not.toHaveBeenCalled();
    expect(mocks.destination).not.toHaveBeenCalled();
  });
  it("handles cancellation inside the app without reopening it", async () => {
    const response = await GET(request("native=1&error=access_denied", true));
    expect(response.headers.get("location")).toBe(origin + "/login?error=access_denied");
    expect(mocks.exchange).not.toHaveBeenCalled();
  });
  it("exchanges ordinary web login in the browser", async () => {
    const response = await GET(request("code=web-code&next=%2Fplan"));
    expect(mocks.exchange).toHaveBeenCalledExactlyOnceWith("web-code");
    expect(response.headers.get("location")).toBe(origin + "/plan");
  });
  it("exchanges custom scheme return inside the app", async () => {
    const response = await GET(request("code=scheme-code&next=%2Fplan", true));
    expect(mocks.exchange).toHaveBeenCalledExactlyOnceWith("scheme-code");
    expect(response.headers.get("location")).toBe(origin + "/plan");
  });
  it("escapes provider errors in the return HTML", async () => {
    const response = await GET(request("native=1&error=" + encodeURIComponent('<script>alert(1)</script>')));
    const html = await response.text();
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("error=%3Cscript%3E");
    expect(mocks.exchange).not.toHaveBeenCalled();
  });
});
