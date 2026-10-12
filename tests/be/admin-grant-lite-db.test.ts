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
    await db.query(readFileSync(new URL("../../supabase/migrations/202610120002_admin_grant_trainer_pass.sql", import.meta.url), "utf8"));
    await db.query(readFileSync(new URL("../../supabase/migrations/202610120003_admin_grant_team_plan.sql", import.meta.url), "utf8"));
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
  it("grants a trainer pass to a member who never requested one", async () => {
    const today = "(now() at time zone 'Asia/Seoul')::date";
    const grant = `select pt_admin_grant_pass($1,$2,$3,${today},${today}+30,$4)`;
    await asUser(member);
    await denied(grant, [member, "회원", "01012345678", 15]);
    expect((await db.query("select pt_has_pass($1) as on", [member])).rows[0].on).toBe(false);

    await asUser(admin);
    await denied(grant, [randomUUID(), "회원", "01012345678", 15]);
    await denied(grant, [member, " ", "01012345678", 15]);
    await denied(grant, [member, "회원", "010-1234-5678", 15]);
    await denied(grant, [member, "회원", "01012345678", 0]);
    await denied(`select pt_admin_grant_pass($1,'회원','01012345678',${today},${today}-1,15)`, [member]);

    await db.query(grant, [member, " 김코치 ", "01012345678", 20]);
    expect((await db.query("select name,phone,status,seats from pt_passes where trainer_id=$1", [member])).rows[0]).toEqual({ name: "김코치", phone: "01012345678", status: "active", seats: 20 });
    expect((await db.query("select pt_has_pass($1) as on", [member])).rows[0].on).toBe(true);

    // 지급한 이용권도 기존 승인 화면의 해지로 끝낼 수 있다.
    await db.query(`select pt_admin_pass($1,${today},${today}+30,20,false)`, [member]);
    expect((await db.query("select pt_has_pass($1) as on", [member])).rows[0].on).toBe(false);
    // 해지된 뒤 다시 지급하면 되살아난다.
    await db.query(grant, [member, "김코치", "01012345678", 15]);
    expect((await db.query("select pt_has_pass($1) as on", [member])).rows[0].on).toBe(true);
  }, 60_000);
  it("grants a team plan to a group that never requested one, at zero price", async () => {
    await db.query("reset role");
    const group = (await db.query("insert into groups(name,owner_id) values('지급 테스트 그룹',$1) returning id", [payer])).rows[0].id;
    await db.query("insert into group_members(group_id,user_id,role) values($1,$2,'owner'),($1,$3,'member') on conflict do nothing", [group, payer, lapsed]);
    const today = "(now() at time zone 'Asia/Seoul')::date";
    const grant = `select admin_grant_team_plan($1,$2,${today},${today}+30,$3,$4)`;

    await asUser(payer);
    await denied(grant, [group, "trainer", 15, null]);
    expect((await db.query("select * from admin_team_grant_candidates()")).rows).toHaveLength(0);
    expect((await db.query("select has_team_premium() as on")).rows[0].on).toBe(false);

    await asUser(admin);
    const listed = (await db.query("select * from admin_team_grant_candidates() where group_id=$1", [group])).rows[0];
    expect(listed).toMatchObject({ name: "지급 테스트 그룹", members: 2 });
    await denied(grant, [randomUUID(), "trainer", 15, null]);
    await denied(grant, [group, "premium", 15, null]);
    await denied(grant, [group, "trainer", -1, null]);
    await denied(`select admin_grant_team_plan($1,'gym',${today},${today}-1,0,null)`, [group]);
    await db.query(grant, [group, "gym", 0, " 체험 지급 "]);
    expect((await db.query("select plan,status,seats,price_krw,memo,requested_by from team_subscriptions where group_id=$1", [group])).rows[0])
      .toEqual({ plan: "gym", status: "active", seats: 0, price_krw: 0, memo: "체험 지급", requested_by: null });
    expect((await db.query("select * from admin_team_grant_candidates() where group_id=$1", [group])).rows).toHaveLength(0);

    // 그룹원 전원이 프리미엄 — 그룹 밖 회원은 아니다.
    for (const [id, on] of [[payer, true], [lapsed, true], [member, false]] as const) {
      await asUser(id);
      expect((await db.query("select has_team_premium() as on")).rows[0].on).toBe(on);
    }
  }, 60_000);
});
