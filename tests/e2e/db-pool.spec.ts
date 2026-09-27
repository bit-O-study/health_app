import { expect, test } from "@playwright/test";
import { createTestAccount } from "./helpers/account-fixture";
import { dbQuery, hasDb, openAuthenticatedDbClient } from "./helpers/db";

test("일반 DB 조회는 인증 트랜잭션과 격리되고 쿼리 오류 후에도 동작한다", async ({ context, baseURL }) => {
  test.skip(!hasDb, "needs DB credentials");
  const { email, user_id } = await createTestAccount(context, baseURL!);
  const identity = "select current_user::text as role, auth.uid()::text as uid";
  const before = await dbQuery(identity);
  const client = await openAuthenticatedDbClient(email);
  try {
    expect((await client.query(identity)).rows).toEqual([{ role: "authenticated", uid: user_id }]);
    expect(await dbQuery(identity)).toEqual(before);
    await expect(dbQuery("select 1 / 0")).rejects.toMatchObject({ code: "22012" });
    expect(await Promise.all([dbQuery("select $1::int as n", [1]), dbQuery("select $1::int as n", [2])]))
      .toEqual([[{ n: 1 }], [{ n: 2 }]]);
    expect((await client.query(identity)).rows).toEqual([{ role: "authenticated", uid: user_id }]);
  } finally {
    await client.query("rollback");
    await client.end();
  }
  expect(await dbQuery(identity)).toEqual(before);
});
