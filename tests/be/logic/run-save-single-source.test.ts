import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * 런닝 저장의 유일한 입구(recordRunSessionAction) — 2026-09-28 런닝 1단계(데이터 안전).
 *  - 처음 저장이면: run_sessions → 오늘 운동 시간 · 마무리 런닝 완료 · 그날 순위 거리(합계로 다시 계산)
 *  - 다시 보낸 것(중복)이면: 아무것도 더하지 않는다 — 기기 대기 큐가 여러 번 보내도 결과가 같다
 *  - 형식이 틀린 기록은 ok+skipped — 큐가 막히지 않게
 */
const m = vi.hoisted(() => ({
  ops: [] as { table: string; op: string; data?: unknown }[],
  insertError: null as null | { code?: string; message: string },
  runRows: [] as { distance_m: number }[],
  cooldown: vi.fn(async () => ({ ok: true })),
}));

function builder(table: string) {
  const q: Record<string, unknown> = {};
  for (const k of ["select", "eq", "limit", "order", "in", "is", "gte", "lte"]) q[k] = () => q;
  q.maybeSingle = async () => ({ data: table === "profiles" ? { weight_kg: 70 } : null, error: null });
  q.insert = async (data: unknown) => {
    m.ops.push({ table, op: "insert", data });
    return { error: m.insertError };
  };
  q.upsert = async (data: unknown) => {
    m.ops.push({ table, op: "upsert", data });
    return { error: null };
  };
  q.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve({ data: table === "run_sessions" ? m.runRows : [], error: null }).then(resolve);
  return q;
}

vi.mock("@/lib/supabase/server", () => ({
  getCurrentUser: async () => ({ id: "user-1" }),
  createSupabaseServerClient: async () => ({ from: (t: string) => builder(t) }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/routine/conditioning-completion-actions", () => ({ setConditioningStatusAction: m.cooldown }));

import { recordRunSessionAction } from "@/features/running/run-record-actions";

const base = {
  clientSessionId: "c432b98c-51b6-49eb-9172-5b55553f883c",
  mode: "outdoor" as const,
  // 서울 2026-09-27 23:50 시작 → 자정을 넘겨 끝나도 기록 날짜는 시작일
  startedAt: "2026-09-27T14:50:00.000Z",
  endedAt: "2026-09-27T15:20:00.000Z",
  distanceM: 5000,
  route: [],
};

beforeEach(() => {
  m.ops.length = 0;
  m.insertError = null;
  m.runRows = [{ distance_m: 3000 }, { distance_m: 5000 }];
  m.cooldown.mockClear();
});

describe("recordRunSessionAction — 저장 한 곳", () => {
  it("처음 저장: 원본 → 운동 시간 → 마무리 완료 → 순위 거리(합계)", async () => {
    const r = await recordRunSessionAction(base);
    expect(r.ok).toBe(true);
    const insert = m.ops.find((o) => o.table === "run_sessions" && o.op === "insert")!.data as { for_date: string };
    expect(insert.for_date).toBe("2026-09-27");
    expect(m.ops.some((o) => o.table === "workout_sessions" && o.op === "upsert")).toBe(true);
    expect(m.cooldown).toHaveBeenCalledTimes(1);
    const dist = m.ops.find((o) => o.table === "daily_run_distance")!.data as { for_date: string; meters: number };
    // 앱이 더하지 않고 run_sessions 합계로 다시 맞춘다(3000 + 5000)
    expect(dist).toMatchObject({ for_date: "2026-09-27", meters: 8000 });
  });

  it("다시 보낸 것(중복)이면 시간·완료·거리를 더하지 않는다", async () => {
    m.insertError = { code: "23505", message: "duplicate" };
    const r = await recordRunSessionAction(base);
    expect(r).toMatchObject({ ok: true, duplicate: true });
    expect(m.cooldown).not.toHaveBeenCalled();
    expect(m.ops.filter((o) => o.table !== "run_sessions")).toEqual([]);
  });

  it("형식이 틀린 기록은 ok+skipped — 대기 큐에서 빠지게", async () => {
    const r = await recordRunSessionAction({ ...base, endedAt: base.startedAt });
    expect(r.ok).toBe(true);
    expect(r.ok && r.skipped).toBeTruthy();
    expect(m.ops).toEqual([]);
  });

  it("서버 오류는 실패 — 큐에 남아 다시 보낸다", async () => {
    m.insertError = { code: "08006", message: "connection failure" };
    const r = await recordRunSessionAction(base);
    expect(r.ok).toBe(false);
    expect(m.cooldown).not.toHaveBeenCalled();
  });
});
