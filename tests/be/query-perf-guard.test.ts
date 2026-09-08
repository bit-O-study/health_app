import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { hasDbCreds, makeClient } from "./db";

/**
 * 쿼리 실행계획 가드(라이브 DB) — 2026-09-08.
 *
 * 성능 회귀는 **기능 테스트를 다 통과하면서** 들어온다. 결과가 맞으니 아무도 못 본다.
 * 여기서는 결과가 아니라 **어떻게 가져오는지**(실행계획·정책 모양)를 못 박는다.
 *
 * 잡으려는 회귀 두 가지:
 *  1. 식품 검색 2단계가 26만 행 **전체 스캔**으로 떨어지는 것.
 *     `name ilike '%q%'` 는 3글자 이상에서만 trigram GIN 을 탄다 — 한국어 검색어는
 *     한두 글자가 기본이라 그대로 두면 219~310ms(최악 1,870ms)가 나온다.
 *  2. RLS 허용정책이 OR 로 합쳐질 때 비싼 함수(`shares_group_with`·`is_admin`)가 **먼저**
 *     평가돼 자기 행만 읽는 조회에서도 행마다 조인이 도는 것.
 *
 * 읽기 전용(자기 픽스처만 넣고 지운다).
 */
describe.skipIf(!hasDbCreds)("쿼리 실행계획 가드(라이브 DB)", () => {
  let client: ReturnType<typeof makeClient>;

  beforeAll(async () => {
    client = makeClient();
    await client.connect();
  }, 30_000);
  afterAll(async () => {
    await client?.end();
  });

  async function plan(sql: string, params: unknown[]): Promise<string> {
    const r = await client.query(`explain ${sql}`, params);
    return r.rows.map((x: Record<string, string>) => x["QUERY PLAN"]).join("\n");
  }

  // 2단계(이름 중간에 낀 것)가 실제로 쓰는 모양. 함수 안이라 EXPLAIN 이 못 들어가서
  // 여기서 같은 where 절을 세운다. schema.sql 의 짧은 검색어 갈래와 같아야 한다.
  const STAGE2_SHORT = `select id from public.custom_foods
     where public.name_grams(name) @> array[lower($1)]
       and name ilike '%' || $1 || '%'
       and lower(name) not like lower($1) || '%'
     order by length(name) asc, hits desc, name asc limit 50`;
  const STAGE2_LONG = `select id from public.custom_foods
     where name ilike '%' || $1 || '%'
       and lower(name) not like lower($1) || '%'
     order by length(name) asc, hits desc, name asc limit 50`;

  it("🔴 한 글자 검색의 2단계가 전체 스캔이 아니다", async () => {
    const p = await plan(STAGE2_SHORT, ["김"]);
    expect(p).not.toMatch(/Seq Scan on custom_foods/);
    expect(p).toContain("custom_foods_name_gram_idx");
  });

  it("🔴 두 글자 검색의 2단계가 전체 스캔이 아니다 — 한국어는 두 글자가 기본", async () => {
    const p = await plan(STAGE2_SHORT, ["우유"]);
    expect(p).not.toMatch(/Seq Scan on custom_foods/);
    expect(p).toContain("custom_foods_name_gram_idx");
  });

  it("세 글자 이상은 trigram 인덱스를 탄다(조각 인덱스는 후보를 못 좁힌다)", async () => {
    const p = await plan(STAGE2_LONG, ["닭가슴살"]);
    expect(p).not.toMatch(/Seq Scan on custom_foods/);
    expect(p).toContain("custom_foods_name_trgm_idx");
  });

  it("조각 인덱스로 좁혀도 결과 집합은 그대로다(재현율 손실 없음)", async () => {
    for (const q of ["우유", "자두", "김"]) {
      const a = await client.query(
        `select count(*)::int n from public.custom_foods where name ilike '%' || $1 || '%'`,
        [q],
      );
      const b = await client.query(
        `select count(*)::int n from public.custom_foods
          where public.name_grams(name) @> array[lower($1)] and name ilike '%' || $1 || '%'`,
        [q],
      );
      expect(b.rows[0].n).toBe(a.rows[0].n);
    }
  }, 60_000);

  it("검색 함수가 길이에 따라 갈라진다 — 라이브 DB 본문 확인", async () => {
    const r = await client.query(`
      select pg_get_functiondef('public.search_custom_foods(text, int)'::regprocedure) as def`);
    const def = r.rows[0].def as string;
    expect(def).toContain("name_grams");
    expect(def).toMatch(/length\(q\) >= 3/);
  });

  // ── RLS: 자기 행 조회에서 비싼 함수가 안 돌아야 한다 ────────────────────────────
  const OWN_READ = [
    ["food_logs", "Users can read own food logs"],
    ["meal_photos", "Users can read own meal photos"],
    ["profiles", "Users can read own profile"],
  ] as const;
  const GUARDED = [
    ["food_logs", "group mates read food logs"],
    ["meal_photos", "group mates read meal photos"],
    ["profiles", "group mates read profiles"],
    ["exercise_completions", "group mates read exercise completions"],
    ["conditioning_completions", "group mates read conditioning completions"],
    ["profiles", "admin reads all profiles"],
  ] as const;

  async function qual(table: string, policy: string): Promise<string> {
    const r = await client.query(
      `select qual from pg_policies where schemaname='public' and tablename=$1 and policyname=$2`,
      [table, policy],
    );
    expect(r.rows[0], `${table}/${policy} 정책이 없다`).toBeTruthy();
    return (r.rows[0].qual as string).replace(/\s+/g, " ");
  }

  it("본인 행 정책은 auth.uid() 를 쿼리당 1회만 평가한다((select …) 로 감싼다)", async () => {
    for (const [table, policy] of OWN_READ) {
      expect(await qual(table, policy), `${table}/${policy}`).toMatch(/SELECT auth\.uid\(\)/i);
    }
  });

  it("🔴 그룹원·관리자 정책은 '남의 행일 때만' 비싼 함수를 부른다", async () => {
    for (const [table, policy] of GUARDED) {
      // 앞에 싼 비교가 없으면 플래너가 함수를 먼저 평가해 행마다 조인이 돈다.
      expect(await qual(table, policy), `${table}/${policy}`).toMatch(
        /user_id <> \( SELECT auth\.uid\(\)/i,
      );
    }
  });

  it("🔴 실제 식단 조회 계획에서 auth.uid() 가 InitPlan 으로 접히고 가드가 앞에 선다", async () => {
    // 로그인 사용자(authenticated)로 흉내 내야 RLS 필터가 계획에 붙는다.
    await client.query("begin");
    try {
      await client.query(`select set_config('role','authenticated',true)`);
      await client.query(`select set_config('request.jwt.claims', $1, true)`, [
        JSON.stringify({ sub: "00000000-0000-0000-0000-000000000000", role: "authenticated" }),
      ]);
      const p = await plan(
        `select id from public.food_logs where user_id = $1 and for_date = $2`,
        ["00000000-0000-0000-0000-000000000000", "2026-09-08"],
      );
      const filter = p.match(/Filter: .*/)?.[0] ?? "";
      // 쿼리당 1회 평가(InitPlan) + 남의 행일 때만 그룹 함수.
      expect(filter).toMatch(/InitPlan/);
      expect(filter).toMatch(/user_id <> \(InitPlan/);
    } finally {
      await client.query("rollback");
    }
  });
});
