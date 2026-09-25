import {randomUUID} from "node:crypto";
import {readFileSync} from "node:fs";
import {test,expect} from "vitest";
import {hasDbCreds,makeClient} from "./db";
test.skipIf(!hasDbCreds)("recommendation preferences: own rows, isolation and validation",async()=>{
 const db=makeClient();await db.connect();
 const owner=randomUUID(),other=randomUUID();
 try{
  await db.query("begin");
  await db.query(readFileSync("supabase/migrations/202609250003_recommendation_preferences.sql","utf8"));
  await db.query("insert into auth.users(id,email) values($1,$2),($3,$4)",[owner,`recommend-${owner}@example.com`,other,`recommend-${other}@example.com`]);
  await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:owner,role:"authenticated"})]);
  await db.query("set local role authenticated");
  await db.query("insert into recommendation_preferences values($1,3,45,'balanced','mixed','familiar')",[owner]);
  expect((await db.query("select days from recommendation_preferences")).rows).toEqual([{days:3}]);
  await db.query("savepoint denied");
  await expect(db.query("insert into recommendation_preferences values($1,3,45,'balanced','mixed','familiar')",[other])).rejects.toThrow();
  await db.query("rollback to savepoint denied");
  await db.query("savepoint invalid");
  await expect(db.query("update recommendation_preferences set days=7 where user_id=$1",[owner])).rejects.toThrow();
  await db.query("rollback to savepoint invalid");
  await db.query("reset role");
  await db.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:other,role:"authenticated"})]);
  await db.query("set local role authenticated");
  expect((await db.query("select * from recommendation_preferences")).rows).toEqual([]);
  expect((await db.query("update recommendation_preferences set days=4 where user_id=$1 returning user_id",[owner])).rowCount).toBe(0);
 }finally{await db.query("rollback");await db.end();}
});