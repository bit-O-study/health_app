/* eslint-disable @typescript-eslint/no-require-imports -- standalone CommonJS DB verifier */
/* Transactional migration/RPC regression. No persistent fixture data.
 * --apply applies ONLY the verified migration after the test transaction rolls back.
 */
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { Client } = require('pg');
const env = {};
for (const line of fs.readFileSync('.env.test.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '');
}
const client = new Client({ host: env.SUPA_DB_HOST, port: Number(env.SUPA_DB_PORT || 5432), user: `postgres.${env.SUPA_DB_REF}`, password: env.SUPA_DB_PW, database: 'postgres', ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000 });
const sql = fs.readFileSync('supabase/migrations/202610060003_group_pledges.sql', 'utf8');
async function asUser(id) {
  await client.query('reset role');
  await client.query("select set_config('request.jwt.claim.sub', $1, true)", [id]);
  await client.query('set local role authenticated');
}
async function denied(query, args = []) {
  await client.query('savepoint denied');
  let failed = false;
  try { await client.query(query, args); } catch { failed = true; }
  await client.query('rollback to savepoint denied');
  assert.ok(failed, 'unauthorized/invalid request must be rejected');
}
(async () => {
  await client.connect();
  try {
    await client.query('begin');
    await client.query(sql);
    const owner = randomUUID(), member = randomUUID(), outsider = randomUUID();
    for (const id of [owner, member, outsider]) await client.query('insert into auth.users(id, email) values($1,$2)', [id, `rollback-group-${id}@example.com`]);
    const { rows: [group] } = await client.query("insert into public.groups(name,owner_id) values('rollback test',$1) returning id", [owner]);
    await client.query("insert into public.group_members(group_id,user_id,role,display_name) values($1,$2,'owner','Owner'),($1,$3,'member','Member')", [group.id, owner, member]);
    const create = "select public.create_group_pledge($1,'Weekly', (now() at time zone 'Asia/Seoul')::date, 7, 1, null) as id";
    await asUser(member); await denied(create, [group.id]);
    await asUser(outsider); await denied('select public.get_group_pledge_results($1)', [[group.id]]);
    await asUser(owner);
    await denied("select public.create_group_pledge($1,'Invalid',(now() at time zone 'Asia/Seoul')::date,7,null,null)", [group.id]);
    const { rows: [pledge] } = await client.query(create, [group.id]);
    await denied('update public.group_pledges set workout_days=7 where id=$1', [pledge.id]);
    const get = async () => (await client.query('select public.get_group_pledge_results($1) as data', [[group.id]])).rows[0].data;
    let data = await get();
    assert.equal(data[0].members.length, 2);
    assert.ok(data[0].members.every((m) => m.status === 'active'));
    await client.query('reset role');
    await client.query("insert into public.group_members(group_id,user_id,display_name) values($1,$2,'Late')", [group.id, outsider]);
    await client.query("update public.group_pledges set start_date=(now() at time zone 'Asia/Seoul')::date-7 where id=$1", [pledge.id]);
    // Multiple exercises on one day count once. This week's target is one day.
    await client.query("insert into public.exercise_completions(user_id,for_date,exercise_row_id,exercise_id,created_at) values($1,(now() at time zone 'Asia/Seoul')::date-2,gen_random_uuid(),'squat',now()-interval '2 days')", [owner]);
    // Member's backdated completion uploaded after cutoff must NOT count.
    await client.query("insert into public.exercise_completions(user_id,for_date,exercise_row_id,exercise_id) values($1,(now() at time zone 'Asia/Seoul')::date-2,gen_random_uuid(),'squat')", [member]);
    await asUser(owner); data = await get();
    assert.equal(data[0].members.length, 2, 'late joiner not enrolled');
    assert.equal(data[0].members.find((m) => m.userId === owner).status, 'success');
    assert.equal(data[0].members.find((m) => m.userId === member).status, 'failed');
    assert.equal(data[0].members.find((m) => m.userId === member).failedWeek, 1);
    await client.query('reset role');
    await client.query('delete from public.exercise_completions where user_id=$1', [owner]);
    await asUser(member); data = await get();
    assert.equal(data[0].members.find((m) => m.userId === owner).status, 'success', 'closed result immutable');
    await client.query('reset role');
    await client.query('delete from public.group_members where group_id=$1 and user_id=$2', [group.id, member]);
    await asUser(member); await denied('select public.get_group_pledge_results($1)', [[group.id]]);
    await asUser(owner); data = await get();
    assert.equal(data[0].members.length, 1, 'departed member hidden');
    await client.query('reset role');
    await client.query("insert into public.group_members(group_id,user_id,display_name) values($1,$2,'Member')", [group.id, member]);
    await asUser(owner);
    const diet = (await client.query("select public.create_group_pledge($1,'Diet',(now() at time zone 'Asia/Seoul')::date,7,null,2) as id", [group.id])).rows[0].id;
    const tail = (await client.query("select public.create_group_pledge($1,'Tail',(now() at time zone 'Asia/Seoul')::date,9,4,null) as id", [group.id])).rows[0].id;
    await client.query('reset role');
    await client.query("update public.group_pledges set start_date=(now() at time zone 'Asia/Seoul')::date-days where id=any($1)", [[diet,tail]]);
    await client.query("insert into public.food_logs(user_id,for_date,meal,name,created_at) select $1,(now() at time zone 'Asia/Seoul')::date-d,m,'test',now()-d*interval '1 day' from generate_series(1,7) d cross join unnest(array['breakfast','dinner']) m", [owner]);
    await client.query("insert into public.food_logs(user_id,for_date,meal,name,created_at) select $1,(now() at time zone 'Asia/Seoul')::date-d,'breakfast','test',now()-d*interval '1 day' from generate_series(1,7) d cross join generate_series(1,2) copies", [member]);
    await client.query("insert into public.exercise_completions(user_id,for_date,exercise_row_id,exercise_id,created_at) select $1,(now() at time zone 'Asia/Seoul')::date-d,gen_random_uuid(),'squat',now()-d*interval '1 day' from unnest(array[9,8,7,6,2]) d", [owner]);
    await asUser(owner); data = await get();
    assert.equal(data.find(p => p.id===diet).members.find(m => m.userId===owner).status,'success');
    assert.equal(data.find(p => p.id===diet).members.find(m => m.userId===member).status,'failed','duplicate meals are not two meals');
    assert.equal(data.find(p => p.id===tail).members.find(m => m.userId===owner).failedWeek,2,'short tail rounds weekly target up');
    await client.query('rollback');
    console.log('PASS: atomic enrollment, owner-only creation, member-only read, direct write denied, invalid targets, active/failed/success, late records, fixed roster, locked results, departure access, daily meals/deduplication, proportional last block. Fixtures rolled back.');
    if (process.argv.includes('--apply')) {
      await client.query('begin'); await client.query(sql); await client.query('commit');
      console.log('Verified group pledge migration applied.');
    }
  } finally { await client.query('rollback').catch(() => {}); await client.end(); }
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
