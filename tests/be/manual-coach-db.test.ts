import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { hasDbCreds, makeClient } from "./db";

// Explicit opt-in: all DDL and generated fixtures roll back, never publish to real members.
describe.skipIf(!hasDbCreds || process.env.MANUAL_COACH_DB_TEST !== "true")("manual coaching transaction", () => {
  const db = makeClient();
  const owner = randomUUID(); const other = randomUUID(); const admin = randomUUID();
  const email = `verify_coach_${admin}@example.invalid`;
  beforeAll(async () => {
    await db.connect();
    await db.query("begin");
    await db.query("set local lock_timeout='3s'; set local statement_timeout='15s'");
    await db.query(readFileSync(new URL("../../supabase/migrations/202610010001_manual_coach.sql", import.meta.url), "utf8"));
    await db.query(readFileSync(new URL("../../supabase/migrations/202610010002_manual_coach_context.sql", import.meta.url), "utf8"));
    for (const id of [owner, other, admin]) await db.query("insert into auth.users(id,email,raw_user_meta_data) values($1,$2,'{}')", [id, id === admin ? email : `verify_coach_${id}@example.invalid`]);
    await db.query("insert into public.admins(email) values($1)", [email]);
    await db.query("insert into subscriptions(user_id,product_id,purchase_token,state,expires_at) values($1,'helssu_coach_monthly',$2,'active',now()+interval '1 day')", [owner, randomUUID()]);
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
  it("isolates users and drafts, enforces subscription, and makes retries idempotent", async () => {
    await db.query("insert into exercise_completions(user_id,exercise_row_id,for_date,status,exercise_id,equipment,sets,reps,weight_kg) values($1,$2,(now() at time zone 'Asia/Seoul')::date,'done','bench-press','barbell',3,8,40)", [owner, randomUUID()]);
    await db.query("insert into routine_exercises(user_id,focus,exercise_id,equipment,sets,reps,weight_kg) values($1,'chest','bench-press','barbell',3,12,40)", [owner]);
    await asUser(owner);
    const id = randomUUID();
    const request = "select manual_coach_request('recommendation','',$1) as id";
    expect((await db.query(request, [id])).rows[0].id).toBe(id);
    const snapshot = (await db.query("select context from manual_coach_requests where id=$1", [id])).rows[0].context;
    expect(snapshot.version).toBe(2); expect(snapshot.exercise_records[0]).toMatchObject({ equipment: "barbell", sets: 3, reps: 8, weight_kg: 40 });
    expect(snapshot.routine_plan[0].reps).toBe(12); expect(snapshot.records_truncated).toBe(false);
    expect((await db.query(request, [randomUUID()])).rows[0].id).toBe(id);
    await denied("select manual_coach_save($1,'forged',true)", [id]);
    await denied("update manual_coach_requests set answer='forged' where id=$1", [id]);
    await denied("select manual_coach_request('recommendation','',$1,$2)", [randomUUID(), other]);
    await asUser(other);
    expect((await db.query("select * from manual_coach_requests where id=$1", [id])).rows).toHaveLength(0);
    await denied(request, [randomUUID()]);
    await asUser(admin);
    const weekly = randomUUID();
    expect((await db.query("select manual_coach_request('habit-report','',$1,$2) as id", [weekly, owner])).rows[0].id).toBe(weekly);
    expect((await db.query("select manual_coach_request('habit-report','',$1,$2) as id", [randomUUID(), owner])).rows[0].id).toBe(weekly);
    await db.query("select manual_coach_save($1,'private draft',false)", [id]);
    await asUser(owner);
    expect((await db.query("select * from manual_coach_drafts where request_id=$1", [id])).rows).toHaveLength(0);
    expect((await db.query("select answer from manual_coach_requests where id=$1", [id])).rows[0].answer).toBeNull();
    await asUser(admin);
    await db.query("select manual_coach_save($1,'reviewed answer',true)", [id]);
    await db.query("select manual_coach_save($1,'reviewed answer',true)", [id]);
    await db.query("reset role");
    await db.query("update subscriptions set expires_at=now()-interval '1 day' where user_id=$1", [owner]);
    await asUser(owner);
    expect((await db.query("select answer from manual_coach_requests where id=$1", [id])).rows[0].answer).toBe("reviewed answer");
    await denied("select manual_coach_request('consultation','질문입니다',$1)", [randomUUID()]);
  }, 60_000);
});
