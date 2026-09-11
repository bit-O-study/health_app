import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { BrowserContext } from "@playwright/test";
import { prepareOnboardedAccount } from "../../e2e/helpers/account-fixture";
import { prepareSetsEditWorkout } from "../../e2e/helpers/workout-fixture";

const userId = "11111111-1111-4111-8111-111111111111";
const requests: { url: string; body: Record<string, unknown>; apiKey: string | null }[] = [];
let noSession = false;
let adminFailure = false;
beforeEach(() => {
  requests.length = 0;
  noSession = false;
  adminFailure = false;
  vi.stubEnv("E2E_SUPABASE_SECRET_KEY", "");
  vi.stubEnv("E2E_RUN_ID", "a".repeat(32));
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://fixture.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-public-key");
  vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const body = JSON.parse(String(init?.body ?? "{}"));
    requests.push({ url, body, apiKey: new Headers(init?.headers).get("apikey") });
    if (url.includes("/admin/users")) return new Response(JSON.stringify(adminFailure
      ? { message: "admin preparation rejected" }
      : { user: { id: userId, email: body.email, user_metadata: body.user_metadata } }),
      { status: adminFailure ? 403 : 200, headers: { "content-type": "application/json" } });
    return new Response(JSON.stringify((url.includes("/signup") || url.includes("/token"))
      ? noSession ? { user: { id: userId } } : {
        access_token: "test-token", refresh_token: "test-refresh", token_type: "bearer",
        expires_in: 3600, user: { id: userId, email: body.email, user_metadata: {} },
      }
      : null), { status: 200, headers: { "content-type": "application/json" } });
  }));
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

function browserContext() {
  const cookies: { name: string; value: string; url: string }[] = [];
  const context = {
    cookies: async () => cookies,
    addCookies: async (values: typeof cookies) => { cookies.push(...values); },
  } as unknown as BrowserContext;
  return { context, cookies };
}

it("prepares only the new user's profile and 4-set squat, and installs the real SDK session cookie", async () => {
  const { context, cookies } = browserContext();
  const email = await prepareSetsEditWorkout(context, "http://localhost:3107");
  expect(email).toMatch(/^e2e_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa_/);
  expect(requests[0].body.email).toBe(email);
  expect(requests.filter(r => r.url.includes("/rest/v1/")).map(r => r.body)).toEqual([
    expect.objectContaining({ user_id: userId, gender: "male", experience: "beginner", lock_weight_reps: true }),
    expect.objectContaining({ user_id: userId, splits: 0, variant_id: "custom", day_index_migrated: true,
      custom_week: [["lower"], ["rest"], ["rest"], ["rest"], ["rest"], ["rest"], ["rest"]] }),
    expect.objectContaining({ user_id: userId, day_index: 0, focus: "lower", exercise_id: "squat", equipment: "barbell", sets: 4, reps: 8, weight_kg: 60 }),
  ]);
  expect(cookies.some(c => c.name.startsWith("sb-fixture-auth-token") && c.value.length > 0 && c.url === "http://localhost:3107")).toBe(true);
});

it("does not seed data when signup requires email confirmation", async () => {
  noSession = true;
  await expect(prepareSetsEditWorkout(browserContext().context, "http://localhost:3107")).rejects.toThrow(/session/i);
  expect(requests).toHaveLength(1);
});

it("does not create an unowned account when global setup has not run", async () => {
  vi.stubEnv("E2E_RUN_ID", "");
  await expect(prepareSetsEditWorkout(browserContext().context, "http://localhost:3107")).rejects.toThrow(/E2E_RUN_ID/);
  expect(requests).toHaveLength(0);
});

it("matches UI onboarding defaults without creating exercises or conditioning", async () => {
  await prepareOnboardedAccount(browserContext().context, "http://localhost:3107");
  expect(requests[0].body.data).toEqual({ name: "검증유저", nickname: "", phone: "+821012345678" });
  const writes = requests.filter(r => r.url.includes("/rest/v1/"));
  expect(writes).toHaveLength(2);
  expect(writes[0].body).toMatchObject({ user_id: userId, phone: "+821012345678", lock_weight_reps: false, goal: "maintain", height_cm: 175, weight_kg: 75, body_type: "lean" });
  expect(writes[1].body).toMatchObject({ user_id: userId, splits: 3, variant_id: "fullbody-3", custom_week: null, baseline_routine: { splits: 3, variant_id: "fullbody-3", custom_week: null }, day_index_migrated: true });
});

it("uses admin creation only for fixture accounts, then authenticates and writes with the public client", async () => {
  vi.stubEnv("E2E_SUPABASE_SECRET_KEY", "test-server-secret");
  const { context, cookies } = browserContext();
  const email = await prepareOnboardedAccount(context, "http://localhost:3107");
  expect(requests.map(r => new URL(r.url).pathname)).toEqual([
    "/auth/v1/admin/users", "/auth/v1/token", "/rest/v1/profiles", "/rest/v1/user_routines",
  ]);
  expect(requests[0]).toMatchObject({ apiKey: "test-server-secret", body: { email, email_confirm: true, user_metadata: { name: "검증유저", nickname: "", phone: "+821012345678" } } });
  expect(requests.slice(1).every(r => r.apiKey === "test-public-key")).toBe(true);
  expect(requests[1].body.email).toBe(email);
  expect(requests[1].url).toContain("grant_type=password");
  expect(JSON.stringify(cookies)).not.toContain("test-server-secret");
  expect(cookies.some(c => c.name.startsWith("sb-fixture-auth-token"))).toBe(true);
});

it("does not fall back to signup or write application data after admin preparation fails", async () => {
  vi.stubEnv("E2E_SUPABASE_SECRET_KEY", "test-server-secret");
  adminFailure = true;
  await expect(prepareOnboardedAccount(browserContext().context, "http://localhost:3107")).rejects.toThrow("admin preparation rejected");
  expect(requests).toHaveLength(1);
  expect(requests[0].url).toContain("/admin/users");
});

it("requires an actual user session after admin creation before writing any application data", async () => {
  vi.stubEnv("E2E_SUPABASE_SECRET_KEY", "test-server-secret");
  noSession = true;
  await expect(prepareOnboardedAccount(browserContext().context, "http://localhost:3107")).rejects.toThrow(/session/i);
  expect(requests.map(r => new URL(r.url).pathname)).toEqual(["/auth/v1/admin/users", "/auth/v1/token"]);
});
