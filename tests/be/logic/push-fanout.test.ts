import { beforeEach, describe, expect, it, vi } from "vitest";

// 회귀(P0): 알림 fan-out 이 "사용자 수 × 왕복" 으로 늘어나면 안 된다.
// - 기기 조회는 사용자 수와 무관하게 (테이블당) 고정 회수여야 한다.
// - 기기 발송은 직렬이 아니라 동시(상한 있음) 여야 한다.
// - 만료(gone) 정리는 기기마다 DELETE 가 아니라 묶어서 한 번이어야 한다.

// 시그니처를 제네릭으로 못박아 둔다 — 개별 테스트에서 `mockImplementation((token) => …)`
// 처럼 인자를 보는 구현으로 갈아끼우려면 인자를 받는 타입이어야 한다
// (`vi.fn(async () => …)` 로 추론시키면 0-인자로 굳어 타입 에러가 난다).
type SendMock = (...a: unknown[]) => Promise<string>;
const sendPush = vi.fn<SendMock>(async () => "ok");
const sendFcm = vi.fn<SendMock>(async () => "ok");

vi.mock("@/features/notifications/push", () => ({
  pushEnabled: () => true,
  sendPush: (...a: unknown[]) => sendPush(...(a as [])),
}));
vi.mock("@/features/notifications/fcm", () => ({
  fcmEnabled: () => true,
  sendFcm: (...a: unknown[]) => sendFcm(...(a as [])),
}));

const { loadDevices, notifyDevices } = await import(
  "@/features/notifications/push-fanout"
);

type Row = Record<string, unknown>;

/** 체이닝 가능한 최소 Supabase 흉내 — 호출 로그를 남긴다. */
function fakeAdmin(tables: Record<string, Row[]>) {
  const calls: { table: string; op: string; ids?: unknown }[] = [];

  function selectBuilder(table: string) {
    let idFilter: string[] | null = null;
    const b = {
      select() {
        return b;
      },
      in(_col: string, ids: string[]) {
        idFilter = ids;
        return b;
      },
      eq() {
        return b;
      },
      then(resolve: (v: { data: Row[] }) => unknown) {
        calls.push({ table, op: "select", ids: idFilter });
        const rows = (tables[table] ?? []).filter(
          (r) => !idFilter || idFilter.includes(String(r.user_id)),
        );
        return Promise.resolve(resolve({ data: rows }));
      },
    };
    return b;
  }

  function deleteBuilder(table: string) {
    const b = {
      in(_col: string, ids: string[]) {
        calls.push({ table, op: "delete", ids });
        return Promise.resolve({ data: null });
      },
    };
    return b;
  }

  return {
    calls,
    client: {
      from(table: string) {
        return {
          select: () => selectBuilder(table),
          delete: () => deleteBuilder(table),
        };
      },
    } as never,
  };
}

const subsFor = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    user_id: `u${i}`,
    endpoint: `e${i}`,
    p256dh: "p",
    auth: "a",
  }));
const toksFor = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ user_id: `u${i}`, token: `t${i}` }));

beforeEach(() => {
  sendPush.mockClear();
  sendFcm.mockClear();
  sendPush.mockImplementation(async () => "ok");
  sendFcm.mockImplementation(async () => "ok");
});

describe("loadDevices — 기기 조회는 사용자 수에 비례하지 않는다", () => {
  it("사용자 100명이어도 테이블당 1회", async () => {
    const ids = Array.from({ length: 100 }, (_, i) => `u${i}`);
    const { client, calls } = fakeAdmin({
      push_subscriptions: subsFor(100),
      fcm_tokens: toksFor(100),
    });
    const map = await loadDevices(client, ids);
    expect(map.size).toBe(100);
    expect(map.get("u7")).toEqual({
      subs: [{ endpoint: "e7", p256dh: "p", auth: "a" }],
      tokens: ["t7"],
    });
    expect(calls.filter((c) => c.op === "select")).toHaveLength(2);
  });

  it("1000명이면 100개씩 묶어 조회(URL 길이 제한) — 그래도 20회", async () => {
    const ids = Array.from({ length: 1000 }, (_, i) => `u${i}`);
    const { client, calls } = fakeAdmin({ push_subscriptions: [], fcm_tokens: [] });
    await loadDevices(client, ids);
    // 1000/100 = 10 묶음 × 2테이블
    expect(calls.filter((c) => c.op === "select")).toHaveLength(20);
    for (const c of calls) expect((c.ids as string[]).length).toBeLessThanOrEqual(100);
  });

  it("대상이 없으면 조회하지 않는다", async () => {
    const { client, calls } = fakeAdmin({});
    expect((await loadDevices(client, [])).size).toBe(0);
    expect(calls).toHaveLength(0);
  });
});

describe("notifyDevices — 기기 발송은 병렬, 만료 정리는 한 번에", () => {
  it("기기가 없으면 false(보낼 것 없음)", async () => {
    const { client } = fakeAdmin({});
    expect(await notifyDevices(client, undefined, p())).toBe(false);
    expect(await notifyDevices(client, { subs: [], tokens: [] }, p())).toBe(false);
    expect(sendPush).not.toHaveBeenCalled();
  });

  it("웹푸시·FCM 모두에 보내고 true", async () => {
    const { client } = fakeAdmin({});
    const ok = await notifyDevices(
      client,
      { subs: [{ endpoint: "e1", p256dh: "p", auth: "a" }], tokens: ["t1", "t2"] },
      p(),
    );
    expect(ok).toBe(true);
    expect(sendPush).toHaveBeenCalledTimes(1);
    expect(sendFcm).toHaveBeenCalledTimes(2);
  });

  it("직렬이 아니다 — 기기 10개가 겹쳐 실행된다", async () => {
    let inFlight = 0;
    let peak = 0;
    sendFcm.mockImplementation(async () => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 2));
      inFlight--;
      return "ok";
    });
    const { client } = fakeAdmin({});
    await notifyDevices(
      client,
      { subs: [], tokens: Array.from({ length: 10 }, (_, i) => `t${i}`) },
      p(),
    );
    expect(peak).toBeGreaterThan(1);
  });

  it("만료(gone) 기기는 모아서 한 번의 DELETE 로 정리", async () => {
    sendFcm.mockImplementation(async (token: unknown) =>
      String(token).startsWith("dead") ? "gone" : "ok",
    );
    const { client, calls } = fakeAdmin({});
    await notifyDevices(
      client,
      { subs: [], tokens: ["ok1", "dead1", "dead2", "ok2", "dead3"] },
      p(),
    );
    const deletes = calls.filter((c) => c.op === "delete");
    expect(deletes).toHaveLength(1);
    expect(deletes[0].ids).toEqual(["dead1", "dead2", "dead3"]);
  });

  it("만료가 없으면 DELETE 자체를 안 한다", async () => {
    const { client, calls } = fakeAdmin({});
    await notifyDevices(client, { subs: [], tokens: ["t1"] }, p());
    expect(calls.filter((c) => c.op === "delete")).toHaveLength(0);
  });
});

function p() {
  return { type: "test", title: "t", body: "b" };
}
