import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { hasDbCreds, makeClient } from "./db";

/**
 * 폭주 제한의 **입구 가드** — 2026-09-07.
 *
 * `ai-quota-guard` 와 같은 병을 잡는다. 코드가 아무리 옳아도 **라이브 DB 의 권한
 * 모양**이 느슨하면 제한이 없는 것과 같다 — 사용자가 `rate_limits` 를 직접 지우거나
 * 0 으로 되돌릴 수 있으면 아이디 찾기를 무한히 두드릴 수 있다.
 *
 * 여기서는 카운터가 **실제로 막는지**까지 확인한다(정책 모양만 보면, 함수가 늘 true 를
 * 돌려주도록 바뀌어도 통과한다). 자기 전용 열쇠로 세고 끝나면 지운다.
 */
describe.skipIf(!hasDbCreds)("폭주 제한 가드(라이브 DB)", () => {
  let client: ReturnType<typeof makeClient>;
  // 실제 트래픽과 절대 겹치지 않는 열쇠.
  const BUCKET = "test:rate-limit-guard";
  const KEY = `guard-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  /**
   * 🔴 창(window)은 **지금 시각**으로 잡는다. 고정된 옛 값(2025-09 같은)을 쓰면
   * `consume_rate_limit` 이 호출마다 1% 확률로 도는 "하루 지난 창 청소"에
   * **검사 중인 행이 지워진다.** 다른 트래픽(E2E 등)이 같이 돌 때만 터져서
   * "단독 실행은 통과, 전체 실행은 실패" 로 나타났다(2026-09-09 원인 규명).
   */
  const WIN = Math.floor(Date.now() / 1000);
  const WIN2 = WIN + 600;

  beforeAll(async () => {
    client = makeClient();
    await client.connect();
  }, 30_000);

  afterAll(async () => {
    if (!client) return;
    await client
      .query(`delete from public.rate_limits where bucket = $1`, [BUCKET])
      .catch(() => {});
    await client.end();
  });

  async function rows<T = Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
  ): Promise<T[]> {
    const res = await client.query(sql, params);
    return res.rows as T[];
  }

  it("rate_limits 는 (bucket, key, window_start) 하나당 한 행이다", async () => {
    const pk = await rows<{ cols: string }>(`
      select string_agg(a.attname, ',' order by a.attname) as cols
        from pg_index i
        join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
       where i.indrelid = 'public.rate_limits'::regclass and i.indisprimary`);
    expect(pk[0]?.cols).toBe("bucket,key,window_start");
  });

  it("RLS 가 켜져 있다", async () => {
    const r = await rows<{ relrowsecurity: boolean }>(
      `select relrowsecurity from pg_class where oid = 'public.rate_limits'::regclass`,
    );
    expect(r[0]?.relrowsecurity).toBe(true);
  });

  it("🔴 정책이 하나도 없다 — 읽기조차. 남은 횟수를 알면 한도 직전까지 정확히 긁는다", async () => {
    const policies = await rows<{ policyname: string; cmd: string }>(`
      select policyname, cmd from pg_policies
       where schemaname = 'public' and tablename = 'rate_limits'`);
    expect(
      policies,
      `rate_limits 에 정책이 생겼다. 이 표는 consume_rate_limit(SECURITY DEFINER)만 만져야 한다.\n${JSON.stringify(policies)}`,
    ).toEqual([]);
  });

  it("consume_rate_limit 은 SECURITY DEFINER 다 — 아니면 정책 때문에 아무것도 못 센다", async () => {
    const fn = await rows<{ prosecdef: boolean; proconfig: string[] | null }>(`
      select prosecdef, proconfig from pg_proc
       where oid = 'public.consume_rate_limit(text, text, bigint, int)'::regprocedure`);
    expect(fn[0]?.prosecdef).toBe(true);
    // search_path 를 고정하지 않으면 호출자가 심은 스키마로 함수가 속을 수 있다.
    expect(fn[0]?.proconfig?.join(",")).toContain("search_path=public");
  });

  it("🔴 로그인 전에도 셀 수 있다 — anon 실행 권한(아이디 찾기는 익명 호출이다)", async () => {
    const g = await rows<{ ok: boolean }>(`
      select has_function_privilege('anon',
        'public.consume_rate_limit(text, text, bigint, int)', 'execute') as ok`);
    expect(g[0]?.ok).toBe(true);
  });

  it("한도까지는 통과하고 그 다음부터 막는다", async () => {
    const win = WIN;
    const limit = 3;
    const call = async () =>
      (
        await rows<{ consume_rate_limit: boolean }>(
          `select public.consume_rate_limit($1, $2, $3, $4)`,
          [BUCKET, KEY, win, limit],
        )
      )[0]!.consume_rate_limit;

    expect(await call()).toBe(true);
    expect(await call()).toBe(true);
    expect(await call()).toBe(true);
    // 4번째 — 한도 초과.
    expect(await call()).toBe(false);
    // 계속 두드려도 계속 막힌다.
    expect(await call()).toBe(false);
  });

  it("막힌 요청은 세지 않는다 — 두드릴수록 창이 길어지면 안 된다", async () => {
    const r = await rows<{ count: number }>(
      `select count from public.rate_limits
        where bucket = $1 and key = $2 and window_start = $3`,
      [BUCKET, KEY, WIN],
    );
    expect(Number(r[0]?.count)).toBe(3);
  });

  it("창이 바뀌면 새로 시작한다", async () => {
    const next = await rows<{ consume_rate_limit: boolean }>(
      `select public.consume_rate_limit($1, $2, $3, $4)`,
      [BUCKET, KEY, WIN2, 3],
    );
    expect(next[0]?.consume_rate_limit).toBe(true);
  });

  it("열쇠가 다르면 서로의 한도를 갉아먹지 않는다", async () => {
    const other = await rows<{ consume_rate_limit: boolean }>(
      `select public.consume_rate_limit($1, $2, $3, $4)`,
      [BUCKET, `${KEY}-other`, WIN, 3],
    );
    expect(other[0]?.consume_rate_limit).toBe(true);
  });
});
