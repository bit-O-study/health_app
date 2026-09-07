import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { hasDbCreds, makeClient } from "./db";

/**
 * 식품 검색 순위 가드(라이브 DB) — 2026-09-07.
 *
 * 식약처 카탈로그를 적재하며 `custom_foods` 가 수십만 행이 됐다. 그 규모에서는 **정렬
 * 규칙이 곧 검색 품질**이다 — hits 만으로 줄 세우면 새 행은 전부 hits=1 이라 상위
 * 결과가 사실상 무작위가 되고, "우유" 를 치면 `빙수_팥_우유얼음` 이 먼저 뜬다.
 * 순위 규칙이 SQL 함수 안에 있어 코드 리뷰로는 안 보이므로 여기서 못 박는다.
 *
 * 자기 전용 행을 넣고 검사한 뒤 지운다(실데이터에 기대지 않는다 — 카탈로그 내용은
 * 언제든 바뀐다).
 */
describe.skipIf(!hasDbCreds)("식품 검색 순위(라이브 DB)", () => {
  let client: ReturnType<typeof makeClient>;
  const TAG = `zzq${Date.now().toString(36)}`;

  // 이름이 짧을수록/정확할수록 위로 와야 한다. 일부러 뒤죽박죽 넣는다.
  const FIXTURES = [
    `빙수_팥_${TAG}얼음`,
    `${TAG}`,
    `${TAG}라면`,
    `아주긴이름의${TAG}가들어간제품`,
    `${TAG}꽃`,
  ];

  beforeAll(async () => {
    client = makeClient();
    await client.connect();
    for (const name of FIXTURES) {
      await client.query(
        `insert into public.custom_foods (name, norm_name, amount, kcal, source)
         values ($1, $2, '100g', 100, 'test')
         on conflict (norm_name) do nothing`,
        [name, name.toLowerCase().replace(/\s+/g, "")],
      );
    }
  }, 30_000);

  afterAll(async () => {
    if (!client) return;
    await client.query(`delete from public.custom_foods where source = 'test'`).catch(() => {});
    await client.end();
  });

  async function search(q: string, limit = 10): Promise<string[]> {
    const r = await client.query(`select name from public.search_custom_foods($1, $2)`, [q, limit]);
    return r.rows.map((x: { name: string }) => x.name);
  }

  it("이름이 정확히 같은 것이 1등이다", async () => {
    const names = await search(TAG);
    expect(names[0]).toBe(TAG);
  });

  it("🔴 짧은 이름이 위로 온다 — 일반명이 짧다('우유' vs '빙수_팥_우유얼음')", async () => {
    const names = await search(TAG);
    const short = names.indexOf(`${TAG}꽃`);
    const long = names.indexOf(`빙수_팥_${TAG}얼음`);
    expect(short).toBeGreaterThanOrEqual(0);
    expect(long).toBeGreaterThanOrEqual(0);
    expect(short).toBeLessThan(long);
  });

  it("검색어로 시작하는 것이 중간에 낀 것보다 위다", async () => {
    const names = await search(TAG);
    expect(names.indexOf(`${TAG}라면`)).toBeLessThan(
      names.indexOf(`아주긴이름의${TAG}가들어간제품`),
    );
  });

  it("🔴 '%' 는 와일드카드로 새지 않는다 — 예전엔 한 글자로 전체 표가 걸렸다", async () => {
    // 이스케이프가 빠지면 '%' 가 모든 행에 매치돼 limit 만큼 돌아온다.
    expect(await search("%")).toEqual([]);
  });

  it("'_' 는 '아무 글자 하나'가 아니라 **글자 그대로** 찾는다", async () => {
    // 이 카탈로그의 이름에는 언더바가 흔하다('라면_떡'). 이스케이프가 빠지면 '_' 가
    // 아무 한 글자에나 매치돼 언더바 없는 이름까지 섞여 들어온다.
    const names = await search("_");
    expect(names.length).toBeGreaterThan(0);
    for (const n of names) expect(n).toContain("_");
  });

  it("🔴 접두사로 한도가 차면 중간에 낀 것은 안 나온다 — 2단계를 건너뛴다", async () => {
    // 이게 속도의 핵심이다. '우유'처럼 접두사 결과가 많은 검색어에서 비싼 2단계
    // (이름 중간 포함, 전체 스캔이 될 수 있다)를 아예 실행하지 않는다.
    // 실측: 우유 433ms → 10ms, 라면 412ms → 1.3ms.
    const names = await search(TAG, 2);
    expect(names).toHaveLength(2);
    // 한도 2를 접두사(TAG, TAG꽃, TAG라면)만으로 채우므로 중간에 낀 것은 안 나온다.
    expect(names).not.toContain(`빙수_팥_${TAG}얼음`);
    expect(names).not.toContain(`아주긴이름의${TAG}가들어간제품`);
  });

  it("접두사로 모자라면 중간에 낀 것으로 채운다", async () => {
    const names = await search(TAG, 10);
    // 접두사는 3개뿐이라 나머지는 2단계에서 온다.
    expect(names).toContain(`빙수_팥_${TAG}얼음`);
    expect(names).toContain(`아주긴이름의${TAG}가들어간제품`);
    // 같은 행이 두 단계에서 겹쳐 나오면 안 된다.
    expect(new Set(names).size).toBe(names.length);
  });

  it("빈 검색어는 아무것도 돌려주지 않는다", async () => {
    expect(await search("")).toEqual([]);
    expect(await search("   ")).toEqual([]);
  });

  it("limit 을 넘겨줄 수 있고 100 을 넘지 않는다", async () => {
    expect((await search(TAG, 2)).length).toBeLessThanOrEqual(2);
    const r = await client.query(`select count(*)::int c from public.search_custom_foods($1, 9999)`, [
      "가",
    ]);
    expect(r.rows[0].c).toBeLessThanOrEqual(100);
  });

  it("SECURITY DEFINER 가 아니다 — RLS(로그인 사용자만 읽기)를 그대로 타야 한다", async () => {
    const r = await client.query(`
      select prosecdef from pg_proc
       where oid = 'public.search_custom_foods(text, int)'::regprocedure`);
    expect(r.rows[0]?.prosecdef).toBe(false);
  });

  it("익명에게는 실행 권한이 없다 — 식품 카탈로그는 로그인 후에만 본다", async () => {
    const r = await client.query(`
      select has_function_privilege('anon',
        'public.search_custom_foods(text, int)', 'execute') as ok`);
    expect(r.rows[0]?.ok).toBe(false);
  });
});
