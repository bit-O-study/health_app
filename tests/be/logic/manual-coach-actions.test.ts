import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ user: vi.fn(), rpc: vi.fn(), refresh: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ getCurrentUser: mock.user, createSupabaseServerClient: async () => ({ rpc: mock.rpc }) }));
vi.mock("next/cache", () => ({ revalidatePath: mock.refresh }));
import { requestManualCoach } from "@/features/coach/manual-actions";
import { DEFAULT_COACH_PREFERENCES } from "@/features/coach/manual-model";
const id = "a432b98c-51b6-49eb-9172-5b55553f883c";
beforeEach(() => { vi.clearAllMocks(); mock.user.mockResolvedValue({ id: "member" }); mock.rpc.mockResolvedValue({ data: id, error: null }); });
describe("coaching request boundary", () => {
  it("does not write unauthenticated requests", async () => { mock.user.mockResolvedValue(null); expect((await requestManualCoach("recommendation", "", id, DEFAULT_COACH_PREFERENCES)).ok).toBe(false); expect(mock.rpc).not.toHaveBeenCalled(); });
  it("passes validated constraints to the subscription-enforcing RPC", async () => {
    expect(await requestManualCoach("recommendation", "", id, DEFAULT_COACH_PREFERENCES)).toEqual({ ok: true, existing: false });
    expect(mock.rpc.mock.calls[0][1].p_question).toContain("30분");
  });
  it("reports existing daily requests instead of pretending updated conditions were saved", async () => {
    mock.rpc.mockResolvedValue({ data: "another-id", error: null });
    expect(await requestManualCoach("recommendation", "", id, DEFAULT_COACH_PREFERENCES)).toEqual({ ok: true, existing: true });
  });
  it("propagates expired subscription rejection", async () => {
    mock.rpc.mockResolvedValue({ error: { code: "42501" } });
    expect((await requestManualCoach("recommendation", "", id, DEFAULT_COACH_PREFERENCES)).ok).toBe(false);
    expect(mock.refresh).not.toHaveBeenCalled();
  });
});