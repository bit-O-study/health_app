import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: vi.fn(), local: vi.fn(), custom: vi.fn(), db: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/features/diet/food-search-actions", () => ({ searchFoodsAction: mocks.local }));
vi.mock("@/features/diet/custom-foods", () => ({ searchCustomFoodsAction: mocks.custom }));
vi.mock("@/features/diet/food-db-actions", () => ({ searchFoodDbAction: mocks.db }));
import { GET } from "@/app/api/foods/search/route";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue({ id: "test-user" });
  for (const search of [mocks.local, mocks.custom, mocks.db]) search.mockResolvedValue([]);
});
const request = (source: string, q = "우유") => new Request("https://example.test/api/foods/search?" + new URLSearchParams({ source, q }));

describe("음식 검색 GET", () => {
  it("비로그인 요청은 데이터를 조회하지 않는다", async () => {
    mocks.user.mockResolvedValue(null);
    expect((await GET(request("custom"))).status).toBe(401);
    expect(mocks.custom).not.toHaveBeenCalled();
  });
  it("허용되지 않은 출처는 거절한다", async () => {
    expect((await GET(request("unknown"))).status).toBe(400);
  });
  it.each(["local", "custom", "db"] as const)("%s만 조회하고 검색어 길이를 제한한다", async (source) => {
    const response = await GET(request(source, "가".repeat(100)));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks[source]).toHaveBeenCalledWith("가".repeat(60));
    for (const other of ["local", "custom", "db"] as const) {
      if (source !== other) expect(mocks[other]).not.toHaveBeenCalled();
    }
  });
  it("공공 DB 응답이 멈춰도 다음 정적 검색은 끝난다", async () => {
    let release!: (rows: unknown[]) => void;
    mocks.db.mockImplementation(() => new Promise<unknown[]>((resolve) => { release = resolve; }));
    const slow = GET(request("db"));
    await vi.waitFor(() => expect(mocks.db).toHaveBeenCalled());
    mocks.local.mockResolvedValue([{ id: "milk", name: "우유" }]);
    expect(await (await GET(request("local"))).json()).toEqual([{ id: "milk", name: "우유" }]);
    release([]);
    await slow;
  });
});
