import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * JWKS 모듈 캐시 — `auth.getClaims()` 로컬 검증용 공개키를 요청마다 다시 받아오지
 * 않게 하는 것이 이 모듈의 존재 이유다. 캐시가 깨지면 인증 왕복 0회라는 전제가
 * 무너지므로(= TTFB 개선이 통째로 사라짐) 캐시 동작을 고정해 둔다.
 *
 * 모듈 스코프 상태를 쓰므로 케이스마다 `resetModules()` 로 새로 불러온다.
 */

const KEY = { kid: "k1", kty: "EC", key_ops: ["verify"] };

async function loadModule() {
  vi.resetModules();
  return import("@/lib/supabase/jwks");
}

function mockFetchOk(keys: unknown[] = [KEY]) {
  return vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ keys }),
  })) as unknown as typeof fetch;
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-key";
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("JWKS 모듈 캐시", () => {
  it("최초 1회만 네트워크로 받아오고, 이후는 캐시로 답한다", async () => {
    const fetchMock = mockFetchOk();
    vi.stubGlobal("fetch", fetchMock);
    const { getSigningKeys } = await loadModule();

    expect(await getSigningKeys()).toEqual([KEY]);
    expect(await getSigningKeys()).toEqual([KEY]);
    expect(await getSigningKeys()).toEqual([KEY]);

    // 3번 호출했지만 왕복은 1회 — 이게 인증 왕복 0회의 근거다.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("동시에 여러 요청이 들어와도 왕복은 1회(in-flight 공유)", async () => {
    const fetchMock = mockFetchOk();
    vi.stubGlobal("fetch", fetchMock);
    const { getSigningKeys } = await loadModule();

    const all = await Promise.all([
      getSigningKeys(),
      getSigningKeys(),
      getSigningKeys(),
    ]);

    expect(all).toEqual([[KEY], [KEY], [KEY]]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("TTL(10분)이 지나면 다시 받아온다", async () => {
    const fetchMock = mockFetchOk();
    vi.stubGlobal("fetch", fetchMock);
    const { getSigningKeys } = await loadModule();

    await getSigningKeys();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(9 * 60 * 1000); // 아직 TTL 안 지남
    await getSigningKeys();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(2 * 60 * 1000); // 총 11분 → 만료
    await getSigningKeys();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("JWKS 조회가 실패해도 throw 하지 않고 빈 배열 — 로그인이 깨지면 안 된다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }) as unknown as typeof fetch,
    );
    const { getSigningKeys } = await loadModule();

    // 빈 배열이면 supabase-js 가 스스로 JWKS 를 받아오거나 getUser() 로 폴백한다.
    await expect(getSigningKeys()).resolves.toEqual([]);
  });

  it("HTTP 에러(5xx)도 빈 배열로 폴백", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 503,
        json: async () => ({}),
      })) as unknown as typeof fetch,
    );
    const { getSigningKeys } = await loadModule();

    await expect(getSigningKeys()).resolves.toEqual([]);
  });

  it("일시적으로 실패해도 이전에 받아둔 키는 계속 쓴다", async () => {
    let fail = false;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        if (fail) throw new Error("network down");
        return { ok: true, status: 200, json: async () => ({ keys: [KEY] }) };
      }) as unknown as typeof fetch,
    );
    const { getSigningKeys } = await loadModule();

    expect(await getSigningKeys()).toEqual([KEY]);

    fail = true;
    vi.advanceTimersByTime(11 * 60 * 1000); // TTL 만료 → 재조회 시도 → 실패
    expect(await getSigningKeys()).toEqual([KEY]); // 옛 캐시 유지
  });

  it("키가 빈 응답이면 캐시를 덮어쓰지 않는다", async () => {
    let empty = false;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ keys: empty ? [] : [KEY] }),
      })) as unknown as typeof fetch,
    );
    const { getSigningKeys } = await loadModule();

    expect(await getSigningKeys()).toEqual([KEY]);

    empty = true;
    vi.advanceTimersByTime(11 * 60 * 1000);
    // 빈 목록으로 캐시를 날려버리면 이후 모든 요청이 원격 폴백으로 떨어진다.
    expect(await getSigningKeys()).toEqual([KEY]);
  });
});
