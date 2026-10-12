import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { hasDbCreds, makeClient } from "./db";

// Explicit opt-in: all DDL and generated fixtures roll back, never grant to real members.
describe.skipIf(!hasDbCreds || process.env.ADMIN_GRANT_DB_TEST !== "true")("admin lite grant transaction", () => {
  const db = makeClient();
  const member = randomUUID(); const payer = randomUUID(); const lapsed = randomUUID(); const admin = randomUUID();
  const email = `verify_grant_${admin}@example.invalid`;
  beforeAll(async () => {
    await db.connect();
    await db.query("begin");
    await db.query("set local lock_timeout='3s'; set local statement_timeout='15s'");
    await db.query(readFileSync(new URL("../../supabase/migrations/202610120001_admin_grant_lite.sql", import.meta.url), "utf8"));
    for (const id of [member, payer, lapsed, admin]) await db.query("insert into auth.users(id,email,raw_user_meta_data) values($1,$2,'{}')", [id, id === admin ? email : `verify_grant_${id}@example.invalid`]);
    await db.query("insert into public.admins(email) values($1)", [email]);
    await db.query("insert into subscriptions(user_id,product_id,purchase_token,state,expires_at,auto_renewing) values($1,'helssu_lite_monthly','play-live','active',now()+interval '10 days',true)", [payer]);
    await db.query("insert into subscriptions(user_id,product_id,purchase_token,state,expires_at) values($1,'helssu_lite_monthly','play-old','expired',now()-interval '10 days')", [lapsed]);
  });
  afterAll(async () => { try { await db.query("rollback"); } finally { await db.end(); } });
  async function asUser(id: string) {
    await db.query("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)", [id, JSON.stringify({ sub: id, email: id === admin ? email : `${id}@example.invalid`, role: "authenticated" })]);
    await db.query("set local role authenticated");
  }
  async function denied(sql: string, args: unknown[]) {
    await db.query("savepoint denied_call");
    try { await expect(db.query(sql, args)).rejects.toBeDefined(); }
    finally { await db.query("rollback to savepoint denied_call"); }
  }
  const row = async (id: string) => { await db.query("reset role"); const r = (await db.query("select product_id,purchase_token,state,auto_renewing,expires_at,expires_at>now() as live from subscriptions where user_id=$1", [id])).rows[0]; await asUser(admin); return r; };
  it("lets only admins grant, extends earlier grants, and never overwrites a paid subscription", async () => {
    await asUser(member);
    await denied("select admin_grant_lite($1,1)", [member]);
    await denied("select admin_revoke_lite($1)", [member]);
    expect((await db.query("select * from admin_member_subscriptions()")).rows).toHaveLength(0);

    await asUser(admin);
    await denied("select admin_grant_lite($1,0)", [member]);
    await denied("select admin_grant_lite($1,13)", [member]);
    await denied("select admin_grant_lite($1,1)", [randomUUID()]);
    await denied("select admin_grant_lite($1,1)", [payer]);
    expect((await row(payer)).purchase_token).toBe("play-live");

    const until = (await db.query("select admin_grant_lite($1,1)::text as until", [member])).rows[0].until;
    const first = await row(member);
    expect(first).toMatchObject({ product_id: "helssu_lite_monthly", purchase_token: `admin-grant:${member}`, state: "active", auto_renewing: false, live: true });
    const extended = (await db.query("select admin_grant_lite($1,3)=$2::timestamptz+interval '3 months' as ok", [member, until])).rows[0];
    expect(extended.ok).toBe(true);

    // 끝난 구글 구독 위에는 지급할 수 있다 — 지금부터 센다.
    await db.query("select admin_grant_lite($1,1)", [lapsed]);
    expect(await row(lapsed)).toMatchObject({ purchase_token: `admin-grant:${lapsed}`, state: "active", live: true });

    const listed = (await db.query("select user_id,granted from admin_member_subscriptions()")).rows;
    expect(listed.find(r => r.user_id === member)?.granted).toBe(true);
    expect(listed.find(r => r.user_id === payer)?.granted).toBe(false);

    // 지급받은 회원은 운영자 상담함(라이트 혜택)을 쓸 수 있다.
    await asUser(member);
    await db.query("select manual_coach_request('consultation','질문입니다',$1)", [randomUUID()]);

    await asUser(admin);
    expect((await db.query("select admin_revoke_lite($1) as done", [payer])).rows[0].done).toBe(false);
    expect((await row(payer)).live).toBe(true);
    expect((await db.query("select admin_revoke_lite($1) as done", [member])).rows[0].done).toBe(true);
    expect(await row(member)).toMatchObject({ state: "expired", live: false });
    expect((await db.query("select admin_revoke_lite($1) as done", [member])).rows[0].done).toBe(false);
  }, 60_000);
});
