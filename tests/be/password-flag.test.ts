import { randomUUID } from "node:crypto";
import { expect, test } from "vitest";

import { hasDbCreds, makeClient } from "./db";

// 관리자가 초기화한 뒤의 '비밀번호 바꾸기'를 건너뛸 수 없다(2026-10-14) — 전부 롤백.
test.skipIf(!hasDbCreds)("임시 비밀번호 그대로면 플래그를 못 내리고, 회원 권한으로 직접 고칠 수도 없다", async () => {
  const db = makeClient();
  await db.connect();
  const member = randomUUID(), admin = randomUUID();
  const email = (id: string) => `pw-flag-${id}@example.com`;
  async function as(id: string) {
    await db.query("reset role");
    await db.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({ sub: id, email: email(id), role: "authenticated" })]);
    await db.query("set local role authenticated");
  }
  const flag = async () =>
    (await db.query("select must_change_password m from public.profiles where user_id=$1", [member])).rows[0]?.m;
  try {
    await db.query("begin");
    for (const id of [member, admin]) {
      await db.query("insert into auth.users(id,email,raw_user_meta_data) values($1,$2,'{}')", [id, email(id)]);
      await db.query("insert into public.profiles(user_id, gender, experience) values($1, 'male', 'beginner') on conflict do nothing", [id]);
    }
    await db.query("insert into public.admins(email) values($1)", [email(admin)]);

    // 관리자가 임시 비밀번호로 초기화 → 바꾸라는 표시가 선다.
    await as(admin);
    await db.query("select public.admin_reset_user_password($1,'temp1234')", [member]);
    await db.query("reset role");
    expect(await flag()).toBe(true);

    // 회원 권한으로 직접 내리려 해도 그대로다.
    await as(member);
    await db.query("update public.profiles set must_change_password=false where user_id=$1", [member]);
    await db.query("reset role");
    expect(await flag()).toBe(true);

    // 비밀번호를 안 바꾸고 마무리하면 거절.
    await as(member);
    expect((await db.query("select public.clear_must_change_password() ok")).rows[0].ok).toBe(false);
    await db.query("reset role");
    expect(await flag()).toBe(true);

    // 비밀번호가 실제로 바뀐 뒤에는 내려간다.
    await db.query("update auth.users set encrypted_password = crypt('mine5678', gen_salt('bf')) where id=$1", [member]);
    await as(member);
    expect((await db.query("select public.clear_must_change_password() ok")).rows[0].ok).toBe(true);
    await db.query("reset role");
    expect(await flag()).toBe(false);
  } finally {
    await db.query("rollback");
    await db.end();
  }
});
