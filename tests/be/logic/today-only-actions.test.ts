import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ writes: [] as { table: string; patch: Record<string, unknown> }[], date: "2026-09-28" }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
 getCurrentUser: async () => ({ id: "owner" }),
 createSupabaseServerClient: async () => ({
   from: (table: string) => {
     const builder = {
       select: () => builder, eq: () => builder, delete: () => builder,
       update: (patch: Record<string, unknown>) => { state.writes.push({ table, patch }); return builder; },
       maybeSingle: async () => ({ data: { rest_date: state.date }, error: null }),
       then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: null, error: null }).then(resolve),
     };
     return builder;
   },
 }),
}));
import { replaceTodayFocusAction, convertTodayToRestAction, undoTodayRestAction } from "@/features/routine/actions";
beforeEach(() => { state.writes.length = 0; vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-28T03:00:00Z")); });
afterEach(() => vi.useRealTimers());
describe("오늘만 변경은 영구 루틴 일정을 바꾸지 않는다", () => {
 it.each([
   ["교체", () => replaceTodayFocusAction("lower")],
   ["휴식", () => convertTodayToRestAction()],
   ["휴식 취소", () => undoTodayRestAction()],
 ] as const)("%s는 오늘 표시용 필드만 쓴다", async (_, action) => {
   await action();
   expect(state.writes.length).toBeGreaterThan(0);
   const allowed = ["last_deferred_date", "deferred_target", "rest_date", "override_date", "override_block"];
   for (const write of state.writes) {
     expect(write.table).toBe("user_routines");
     expect(Object.keys(write.patch).every(key => allowed.includes(key))).toBe(true);
     expect(write.patch).not.toHaveProperty("start_date");
     expect(write.patch).not.toHaveProperty("custom_week");
   }
 });
 it("다른 날짜의 휴식은 취소하지 않는다", async () => {
   state.date = "2026-09-27";
   await undoTodayRestAction();
   expect(state.writes).toEqual([]);
   state.date = "2026-09-28";
 });
});
