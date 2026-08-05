import { describe, expect, it } from "vitest";

import { chunk, fetchAllPages, mapWithConcurrency } from "@/lib/batch";

describe("chunk", () => {
  it("size 개씩 자른다(마지막은 남은 만큼)", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("빈 배열은 빈 결과", () => {
    expect(chunk([], 10)).toEqual([]);
  });

  it("size 가 0 이하면 통째로 하나(무한루프 방지)", () => {
    expect(chunk([1, 2, 3], 0)).toEqual([[1, 2, 3]]);
    expect(chunk([], 0)).toEqual([]);
  });
});

describe("mapWithConcurrency", () => {
  it("전부 처리하고 결과 순서는 입력 순서", async () => {
    const out = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (n) => n * 10);
    expect(out).toEqual([10, 20, 30, 40, 50]);
  });

  it("동시 실행 수가 limit 을 넘지 않는다", async () => {
    let inFlight = 0;
    let peak = 0;
    await mapWithConcurrency(Array.from({ length: 20 }, (_, i) => i), 3, async () => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 1));
      inFlight--;
      return null;
    });
    expect(peak).toBe(3);
  });

  it("직렬(limit 1)도 되고, 항목보다 limit 이 커도 안전", async () => {
    const order: number[] = [];
    await mapWithConcurrency([1, 2, 3], 1, async (n) => {
      order.push(n);
      return n;
    });
    expect(order).toEqual([1, 2, 3]);
    expect(await mapWithConcurrency([1], 99, async (n) => n)).toEqual([1]);
    expect(await mapWithConcurrency([], 5, async (n) => n)).toEqual([]);
  });

  it("limit 이 0/음수여도 최소 1로 동작(멈추지 않는다)", async () => {
    expect(await mapWithConcurrency([1, 2], 0, async (n) => n)).toEqual([1, 2]);
    expect(await mapWithConcurrency([1, 2], -5, async (n) => n)).toEqual([1, 2]);
  });
});

describe("fetchAllPages — PostgREST 행 상한(max-rows) 넘겨 받기", () => {
  /** 요청받은 (from, to) 구간만 잘라 주는 가짜 페이저 — 호출 구간을 기록한다. */
  const pagerOf = (rows: number[]) => {
    const calls: [number, number][] = [];
    const page = async (from: number, to: number) => {
      calls.push([from, to]);
      return { data: rows.slice(from, to + 1) };
    };
    return { page, calls };
  };

  it("한 페이지에 안 들어가면 끝까지 이어 받는다", async () => {
    const rows = Array.from({ length: 2500 }, (_, i) => i);
    const { page, calls } = pagerOf(rows);
    const out = await fetchAllPages(page, 1000);
    expect(out).toHaveLength(2500);
    expect(out[2499]).toBe(2499);
    expect(calls).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });

  it("한 페이지로 끝나면 추가 조회 안 함", async () => {
    const { page, calls } = pagerOf([1, 2, 3]);
    expect(await fetchAllPages(page, 1000)).toEqual([1, 2, 3]);
    expect(calls).toHaveLength(1);
  });

  it("정확히 페이지 크기로 떨어지면 빈 페이지 한 번 더 확인", async () => {
    const rows = Array.from({ length: 20 }, (_, i) => i);
    const { page, calls } = pagerOf(rows);
    const out = await fetchAllPages(page, 10);
    expect(out).toHaveLength(20);
    expect(calls).toHaveLength(3); // 10 + 10 + 0
  });

  it("data 가 null 이어도(오류 등) 멈추고 지금까지 것만", async () => {
    const out = await fetchAllPages(async () => ({ data: null }), 10);
    expect(out).toEqual([]);
  });

  it("maxPages 를 넘겨 무한히 돌지 않는다", async () => {
    let calls = 0;
    const out = await fetchAllPages(
      async () => {
        calls++;
        return { data: [1, 2] }; // 항상 가득 찬 페이지를 주는 고장난 응답
      },
      2,
      5,
    );
    expect(calls).toBe(5);
    expect(out).toHaveLength(10);
  });
});
