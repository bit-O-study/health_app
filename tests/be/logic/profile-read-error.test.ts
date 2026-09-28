import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("react", () => ({ cache: <T,>(fn: T) => fn }));
vi.mock("@/lib/supabase/server", () => ({
  getCurrentUser: async () => ({ id: "owner" }),
  createSupabaseServerClient: async () => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.read }) }) }) }),
}));
import { getUserProfile } from "@/features/profile/data-access";
beforeEach(() => vi.clearAllMocks());
describe("profile lookup", () => {
  it("does not mistake a failed lookup for an unfinished onboarding", async () => {
    mocks.read.mockResolvedValue({ data: null, error: { message: "internal database detail" } });
    await expect(getUserProfile()).rejects.toThrow("프로필을 불러오지 못했어요.");
  });
  it("returns null only for a missing profile", async () => {
    mocks.read.mockResolvedValue({ data: null, error: null });
    await expect(getUserProfile()).resolves.toBeNull();
  });
});
