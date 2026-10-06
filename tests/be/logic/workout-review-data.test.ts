import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ user: vi.fn(), profile: vi.fn(), result: { data: [] as Record<string, unknown>[] | null, error: null as unknown }, eq: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ getCurrentUser: mock.user, createSupabaseServerClient: async () => ({ from: () => {
  const chain: Record<string, unknown> = {};
  for (const name of ["select", "gte", "lte", "order"]) chain[name] = () => chain;
  chain.eq = (...args: unknown[]) => { mock.eq(...args); return chain; };
  chain.limit = async () => mock.result;
  return chain;
} }) }));
vi.mock("@/features/profile/data-access", () => ({ getUserProfile: mock.profile }));
vi.mock("@/features/routine/data", () => ({ seoulYmd: () => "2026-10-01" }));
import { getCoachReview } from "@/features/coach/workout-review-data";
beforeEach(() => { vi.clearAllMocks(); mock.user.mockResolvedValue({ id: "current-member" }); mock.profile.mockResolvedValue({ experience: "beginner" }); mock.result = { data: [], error: null }; });
describe("private workout review loading", () => {
  it("does not read records without a session", async () => { mock.user.mockResolvedValue(null); expect((await getCoachReview()).error).toBeTruthy(); expect(mock.eq).not.toHaveBeenCalled(); });
  it("restricts reads to the authenticated member and completed records", async () => {
    const result = await getCoachReview(); expect(result.error).toBeNull();
    expect(mock.eq).toHaveBeenCalledWith("user_id", "current-member"); expect(mock.eq).toHaveBeenCalledWith("status", "done");
  });
  it("does not disguise a database error as a week with zero workouts", async () => {
    mock.result = { data: null, error: { code: "unavailable" } };
    const result = await getCoachReview(); expect(result.review).toBeNull(); expect(result.error).toBeTruthy();
  });
  it("does not show an incomplete summary when the row limit is exceeded", async () => {
    mock.result.data = Array.from({ length: 1001 }, () => ({}));
    expect((await getCoachReview()).review).toBeNull();
  });
});