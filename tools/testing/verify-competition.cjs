/* eslint-disable @typescript-eslint/no-require-imports */
const fs=require('node:fs'), assert=require('node:assert/strict'),{randomUUID}=require('node:crypto'),{Client}=require('pg');
const env={};
for(const line of fs.readFileSync('.env.test.local','utf8').split(/\r?\n/)){const m=line.match(/^([A-Z_]+)=(.*)$/);if(m)env[m[1]]=m[2].trim().replace(/^['"]|['"]$/g,'');}
const db=new Client({host:env.SUPA_DB_HOST,port:Number(env.SUPA_DB_PORT||5432),user:`postgres.${env.SUPA_DB_REF}`,password:env.SUPA_DB_PW,database:'postgres',ssl:{rejectUnauthorized:false},connectionTimeoutMillis:10000});
const sql=fs.readFileSync('supabase/migrations/202610200001_competition_scores.sql','utf8');
async function asUser(id){await db.query('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[id]);await db.query('set local role authenticated');}
(async()=>{
 await db.connect();
 try{
  await db.query('begin');await db.query(sql);
  const a=randomUUID(),b=randomUUID(),out=randomUUID();
  for(const id of[a,b,out])await db.query('insert into auth.users(id,email) values($1,$2)',[id,`competition-rollback-${id}@example.com`]);
  const {rows:[g]}=await db.query("insert into public.groups(name,owner_id) values('competition rollback',$1) returning id",[a]);
  await db.query("insert into public.group_members(group_id,user_id,role) values($1,$2,'owner'),($1,$3,'member')",[g.id,a,b]);
  await db.query("insert into public.exercise_completions(user_id,for_date,exercise_row_id,exercise_id,sets,reps) values($1,(now() at time zone 'Asia/Seoul')::date,gen_random_uuid(),'squat',3,10)",[a]);
  await db.query("insert into public.conditioning_completions(user_id,for_date,kind,item_id,source_row_id,duration_min) values($1,(now() at time zone 'Asia/Seoul')::date,'warmup','test',gen_random_uuid(),10)",[a]);
  await asUser(a);
  let result=await db.query('select * from public.competition_totals($1)',[g.id]);
  assert.equal(result.rows.length,2);
  assert.deepEqual(result.rows.find(r=>r.user_id===a).today,{sets:12,reps:6,conditioning:20,attendance:20,total:58});
  assert.equal(result.rows.find(r=>r.user_id===b).lifetime.total,0);
  assert.equal((await db.query('select * from public.competition_totals(null)')).rows.length,1);
  await db.query("update public.exercise_completions set status='skipped' where user_id=$1",[a]);
  assert.equal((await db.query('select * from public.competition_totals(null)')).rows[0].today.total,40);
  await db.query("update public.exercise_completions set status='done',set_details=$2::jsonb where user_id=$1",[a,JSON.stringify([{reps:10},{reps:5}])]);
  assert.equal((await db.query('select * from public.competition_totals(null)')).rows[0].today.total,51);
  await db.query("update public.exercise_completions set status='partial' where user_id=$1",[a]);
  assert.equal((await db.query('select * from public.competition_totals(null)')).rows[0].today.total,40);
  await asUser(out);await db.query('savepoint denied');
  await assert.rejects(()=>db.query('select * from public.competition_totals($1)',[g.id]));
  await db.query('rollback to savepoint denied');
  assert.equal((await db.query('select * from public.competition_totals(null)')).rows[0].lifetime.total,0);
  await db.query('reset role');
  await db.query("insert into public.exercise_completions(user_id,for_date,exercise_row_id,exercise_id,sets,reps) select $1,(now() at time zone 'Asia/Seoul')::date,gen_random_uuid(),'squat',20,100 from generate_series(1,1005)",[b]);
  await db.query("insert into public.conditioning_completions(user_id,for_date,kind,item_id,source_row_id,duration_min) values($1,(now() at time zone 'Asia/Seoul')::date,'warmup','test',gen_random_uuid(),100)",[b]);
  await asUser(b);
  assert.equal((await db.query('select * from public.competition_totals(null)')).rows[0].today.total,320);
  await db.query("update public.exercise_completions set set_details='{}'::jsonb where user_id=$1",[b]);
  assert.equal((await db.query('select * from public.competition_totals(null)')).rows[0].today.total,320);
  await db.query('reset role');
  const tables=(await db.query("select tablename from pg_publication_tables where pubname='supabase_realtime' and schemaname='public'")).rows.map(r=>r.tablename);
  for(const t of ['exercise_completions','conditioning_completions','group_members'])assert.ok(tables.includes(t));
  await db.query('rollback');
  console.log('PASS: group/self totals, breakdown, undo, per-set snapshot, partial exclusion, outsider denial, realtime publication. Fixtures rolled back.');
  if(process.argv.includes('--apply')){await db.query('begin');await db.query(sql);await db.query("notify pgrst,'reload schema'");await db.query('commit');console.log('Migration applied; existing records and RLS preserved.');}
 }catch(e){await db.query('rollback');throw e;}finally{await db.end();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
