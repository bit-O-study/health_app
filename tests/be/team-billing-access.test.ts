import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { hasDbCreds, makeClient } from "./db";

/**
 * 팀 요금제(B2B) 권한 가드(라이브 DB) — 2026-09-09.
 *
 * 🔴 여기가 뚫리면 **돈을 안 내고 프리미엄이 된다.** 그룹장이 자기 신청을 스스로
 * 승인할 수 있으면 결제 자체가 무의미하다. 그런데 화면은 어느 쪽이든 똑같이 동작한다.
 *
 * ⚠ 검사 계정은 **관리자를 뺀다.** 관리자를 그룹장으로 뽑으면 `is_admin()` 정책이 통과해
 *   "자가 승인이 된다"는 오탐이 난다(실제로 처음에 그렇게 헷갈렸다).
 */
describe.skipIf(!hasDbCreds)("팀 요금제 권한(라이브 DB)", () => {
  let client: ReturnType<typeof makeClient>;
  let groupId = "";
  let ownerId = "";
  let memberId = "";
  let strangerId = "";
  const emailOf = new Map<string, string>();

  beforeAll(async () => {
    client = makeClient();
    await client.connect();
    const users = await client.query(
      `select p.user_id, u.email from public.profiles p
         join auth.users u on u.id = p.user_id
        where lower(u.email) not in (select lower(email) from public.admins)
        order by p.created_at asc limit 3`,
    );
    if ((users.rowCount ?? 0) >= 3) {
      [ownerId, memberId, strangerId] = users.rows.map((r) => r.user_id);
      for (const r of users.rows) emailOf.set(r.user_id, r.email);
      const g = await client.query(
        `insert into public.groups (name, owner_id) values ($1,$2) returning id`,
        [`zzbill${Date.now().toString(36)}`, ownerId],
      );
      groupId = g.rows[0].id;
      await client.query(
        `insert into public.group_members (group_id, user_id, role)
         values ($1,$2,'owner'), ($1,$3,'member')`,
        [groupId, ownerId, memberId],
      );
    }
  }, 30_000);

  afterAll(async () => {
    if (!client) return;
    if (groupId) {
      await client.query(`delete from public.groups where id = $1`, [groupId]).catch(() => {});
    }
    await client.end();
  });

  async function as<T>(uid: string, fn: () => Promise<T>): Promise<T> {
    await client.query("begin");
    try {
      await client.query(`select set_config('role','authenticated',true)`);
      await client.query(`select set_config('request.jwt.claims',$1,true)`, [
        JSON.stringify({ sub: uid, email: emailOf.get(uid) ?? "", role: "authenticated" }),
      ]);
      return await fn();
    } finally {
      await client.query("rollback");
    }
  }

  const request = (uid: string) =>
    client.query(
      `insert into public.team_subscriptions (group_id, plan, requested_by)
       values ($1,'trainer',$2)`,
      [groupId, uid],
    );

  it("그룹장은 이용 신청을 낼 수 있다", async () => {
    expect(groupId, "검사용 그룹을 못 만들었다(관리자 아닌 프로필 3개 필요)").not.toBe("");
    await expect(as(ownerId, () => request(ownerId))).resolves.toBeTruthy();
  });

  it("🔴 일반 멤버는 신청을 못 낸다", async () => {
    await expect(as(memberId, () => request(memberId))).rejects.toThrow();
  });

  it("🔴 그룹장이 스스로 승인할 수 없다 — 여기가 뚫리면 결제가 무의미하다", async () => {
    const status = await as(ownerId, async () => {
      await request(ownerId);
      // ⚠ 정책이 막으면 **예외를 던져** 트랜잭션이 통째로 무효가 된다. 그러면 뒤이은
      //   확인 조회까지 같이 죽어서 "막혔는지"를 못 본다 → 세이브포인트로 감싼다.
      await client.query("savepoint try_self_approve");
      try {
        await client.query(
          `update public.team_subscriptions
              set status='active', period_end = current_date + 30
            where group_id = $1`,
          [groupId],
        );
      } catch {
        await client.query("rollback to savepoint try_self_approve");
      }
      const r = await client.query(
        `select status from public.team_subscriptions where group_id = $1`,
        [groupId],
      );
      return r.rows[0]?.status;
    });
    // 예외로 막히든 0행으로 막히든, 결과는 '아직 신청 상태' 여야 한다.
    expect(status).toBe("requested");
  });

  it("🔴 신청 내역은 그룹장 말고 아무에게도 안 보인다", async () => {
    await client.query("begin");
    try {
      await client.query(
        `insert into public.team_subscriptions (group_id, plan, requested_by, price_krw)
         values ($1,'gym',$2,149000)`,
        [groupId, ownerId],
      );
      async function rows(uid: string): Promise<number> {
        await client.query(`select set_config('role','authenticated',true)`);
        await client.query(`select set_config('request.jwt.claims',$1,true)`, [
          JSON.stringify({ sub: uid, email: emailOf.get(uid) ?? "", role: "authenticated" }),
        ]);
        const r = await client.query(
          `select count(*)::int n from public.team_subscriptions where group_id = $1`,
          [groupId],
        );
        await client.query(`select set_config('role','postgres',true)`);
        return r.rows[0].n;
      }
      // 금액·사업자정보가 들어 있다 — 회원에게 보일 값이 아니다.
      expect(await rows(ownerId)).toBe(1);
      expect(await rows(memberId)).toBe(0);
      expect(await rows(strangerId)).toBe(0);
    } finally {
      await client.query("rollback");
    }
  });

  it("🔴 활성 팀 구독은 그 그룹 회원 전원에게 프리미엄을 준다", async () => {
    await client.query("begin");
    try {
      await client.query(
        `insert into public.team_subscriptions
           (group_id, plan, status, requested_by, period_start, period_end)
         values ($1,'gym','active',$2, current_date, current_date + 30)`,
        [groupId, ownerId],
      );
      async function premium(uid: string): Promise<boolean> {
        await client.query(`select set_config('role','authenticated',true)`);
        await client.query(`select set_config('request.jwt.claims',$1,true)`, [
          JSON.stringify({ sub: uid, email: emailOf.get(uid) ?? "", role: "authenticated" }),
        ]);
        const r = await client.query(`select public.has_team_premium() as ok`);
        await client.query(`select set_config('role','postgres',true)`);
        return r.rows[0].ok === true;
      }
      expect(await premium(ownerId), "그룹장").toBe(true);
      expect(await premium(memberId), "회원도 프리미엄이어야 한다").toBe(true);
      expect(await premium(strangerId), "남남에게 주면 안 된다").toBe(false);
    } finally {
      await client.query("rollback");
    }
  });

  it("🔴 기간이 지난 구독은 프리미엄이 아니다 — 아무도 안 건드려도 끊긴다", async () => {
    await client.query("begin");
    try {
      await client.query(
        `insert into public.team_subscriptions
           (group_id, plan, status, requested_by, period_start, period_end)
         values ($1,'gym','active',$2, current_date - 60, current_date - 1)`,
        [groupId, ownerId],
      );
      await client.query(`select set_config('role','authenticated',true)`);
      await client.query(`select set_config('request.jwt.claims',$1,true)`, [
        JSON.stringify({ sub: memberId, email: emailOf.get(memberId) ?? "", role: "authenticated" }),
      ]);
      const r = await client.query(`select public.has_team_premium() as ok`);
      expect(r.rows[0].ok).toBe(false);
    } finally {
      await client.query("rollback");
    }
  });

  it("권한 함수는 SECURITY DEFINER + search_path 고정이고 익명은 못 부른다", async () => {
    const r = await client.query(`
      select prosecdef, proconfig from pg_proc
       where oid = 'public.has_team_premium()'::regprocedure`);
    expect(r.rows[0]?.prosecdef).toBe(true);
    expect((r.rows[0]?.proconfig ?? []).join(",")).toContain("search_path=");
    const g = await client.query(`
      select has_function_privilege('anon','public.has_team_premium()','execute') as ok`);
    expect(g.rows[0]?.ok).toBe(false);
  });
});
