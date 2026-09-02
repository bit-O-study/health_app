import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { hasDbCreds, makeClient } from "./db";

/**
 * AI 사용량 한도의 **입구 가드** — 로드맵 7.1.
 *
 * 한도는 사용자가 스스로 되돌릴 수 있으면 아무 의미가 없다. 여기서 검사하는 것은
 * 순수 로직이 아니라 **라이브 DB 의 권한 모양**이다. 코드가 아무리 옳아도 정책이
 * 느슨하면 클라이언트가 `ai_usage` 를 직접 0 으로 만들고 무한히 부를 수 있다.
 *
 * 읽기 전용(카탈로그만 조회).
 */
describe.skipIf(!hasDbCreds)("AI 사용량 한도 가드(라이브 DB)", () => {
  let client: ReturnType<typeof makeClient>;

  beforeAll(async () => {
    client = makeClient();
    await client.connect();
  }, 30_000);
  afterAll(async () => {
    await client?.end();
  });

  async function rows<T = Record<string, unknown>>(sql: string): Promise<T[]> {
    const res = await client.query(sql);
    return res.rows as T[];
  }

  it("ai_usage 는 (user_id, month, feature) 하나당 한 행이다", async () => {
    const pk = await rows<{ cols: string }>(`
      select string_agg(a.attname, ',' order by a.attname) as cols
        from pg_index i
        join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
       where i.indrelid = 'public.ai_usage'::regclass and i.indisprimary`);
    expect(pk[0]?.cols).toBe("feature,month,user_id");
  });

  it("RLS 가 켜져 있다", async () => {
    const r = await rows<{ relrowsecurity: boolean }>(
      `select relrowsecurity from pg_class where oid = 'public.ai_usage'::regclass`,
    );
    expect(r[0]?.relrowsecurity).toBe(true);
  });

  it("🔴 사용자가 직접 쓰는 정책이 없다 — 있으면 한도를 스스로 0 으로 되돌린다", async () => {
    const policies = await rows<{ policyname: string; cmd: string }>(`
      select policyname, cmd from pg_policies
       where schemaname = 'public' and tablename = 'ai_usage'`);
    const writes = policies.filter((p) => p.cmd !== "SELECT");
    expect(
      writes,
      `ai_usage 에 쓰기 정책이 생겼다. 사용량은 consume_ai_quota(SECURITY DEFINER)로만 올라야 한다.\n${JSON.stringify(policies)}`,
    ).toEqual([]);
    // 읽기는 있어야 한다(남은 횟수 안내).
    expect(policies.some((p) => p.cmd === "SELECT")).toBe(true);
  });

  it("consume_ai_quota 는 SECURITY DEFINER 다 — 아니면 위 정책 때문에 못 센다", async () => {
    const fn = await rows<{ prosecdef: boolean; proconfig: string[] | null }>(`
      select p.prosecdef, p.proconfig
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname = 'consume_ai_quota'`);
    expect(fn).toHaveLength(1);
    expect(fn[0].prosecdef).toBe(true);
    // search_path 를 고정하지 않은 SECURITY DEFINER 는 권한 상승 통로가 된다.
    expect((fn[0].proconfig ?? []).join(",")).toContain("search_path");
  });

  it("함수 실행 권한이 로그인 사용자에게만 있다(public 아님)", async () => {
    const acl = await rows<{ granted: boolean }>(`
      select has_function_privilege('public', 'public.consume_ai_quota(text, text, int)', 'execute') as granted`);
    expect(
      acl[0]?.granted,
      "PUBLIC 에 execute 가 남아 있다 — 로그인 안 한 요청도 카운터를 건드릴 수 있다.",
    ).toBe(false);

    const authed = await rows<{ granted: boolean }>(`
      select has_function_privilege('authenticated', 'public.consume_ai_quota(text, text, int)', 'execute') as granted`);
    expect(authed[0]?.granted).toBe(true);
  });

  it("ai_analyses 는 본인만 읽고 쓴다 — 남의 코칭 기록이 보이면 안 된다", async () => {
    const r = await rows<{ relrowsecurity: boolean }>(
      `select relrowsecurity from pg_class where oid = 'public.ai_analyses'::regclass`,
    );
    expect(r[0]?.relrowsecurity).toBe(true);
    const policies = await rows<{ qual: string | null; with_check: string | null }>(`
      select qual, with_check from pg_policies
       where schemaname = 'public' and tablename = 'ai_analyses'`);
    expect(policies.length).toBeGreaterThan(0);
    for (const p of policies) {
      // 조건이 auth.uid() 에 묶여 있지 않으면 남의 행에 닿을 수 있다.
      expect(`${p.qual ?? ""}${p.with_check ?? ""}`).toContain("uid()");
    }
  });

  it("한도를 넘으면 -1 을 주고 **더 올리지 않는다**(트랜잭션 안에서 검사 후 롤백)", async () => {
    // 실제 사용자 한 명을 빌려 세어 보고 되돌린다 — 라이브 데이터를 남기지 않는다.
    await client.query("begin");
    try {
      const u = await rows<{ id: string }>(
        `select id from auth.users order by created_at desc limit 1`,
      );
      if (u.length === 0) return; // 계정이 하나도 없으면 검사할 게 없다
      const userId = u[0].id;
      const month = "1999-01"; // 실제 집계와 절대 안 겹치는 달
      // 함수는 auth.uid() 를 쓰므로 여기서는 같은 SQL 을 직접 흉내 내어
      // **한도에 걸리면 갱신 대상이 없다**는 핵심 동작만 확인한다.
      const bump = async (limit: number) =>
        (
          await client.query(
            `insert into public.ai_usage (user_id, month, feature, used, updated_at)
             values ($1, $2, 'coach', 1, now())
             on conflict (user_id, month, feature) do update
               set used = public.ai_usage.used + 1, updated_at = now()
               where public.ai_usage.used < $3
             returning used`,
            [userId, month, limit],
          )
        ).rows[0]?.used ?? null;

      expect(await bump(2)).toBe(1);
      expect(await bump(2)).toBe(2);
      // 한도(2)에 닿았다 → 갱신 대상 없음 = null(코드에서 -1 로 바꿔 돌려준다)
      expect(await bump(2)).toBeNull();
      const after = await rows<{ used: number }>(
        `select used from public.ai_usage where user_id = '${userId}' and month = '${month}'`,
      );
      expect(after[0].used, "막힌 호출이 카운터를 더 올리면 안 된다").toBe(2);
    } finally {
      await client.query("rollback");
    }
  });
});
