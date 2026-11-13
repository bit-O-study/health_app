/* eslint-disable @typescript-eslint/no-require-imports */
const fs=require('node:fs'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto'),{Client}=require('pg');
const env={};for(const line of fs.readFileSync('.env.test.local','utf8').split(/\r?\n/)){const m=line.match(/^([A-Z_]+)=(.*)$/);if(m)env[m[1]]=m[2].trim().replace(/^['"]|['"]$/g,'');}
const db=new Client({host:env.SUPA_DB_HOST,port:Number(env.SUPA_DB_PORT||5432),user:`postgres.${env.SUPA_DB_REF}`,password:env.SUPA_DB_PW,database:'postgres',ssl:{rejectUnauthorized:false},connectionTimeoutMillis:10000});
const sql=fs.readFileSync('supabase/migrations/202610200002_weekly_leagues.sql','utf8');
async function asUser(id){await db.query('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[id]);await db.query('set local role authenticated');}
(async()=>{await db.connect();try{
 await db.query('begin');await db.query(sql);
 const a=randomUUID(),b=randomUUID(),c=randomUUID(),out=randomUUID();
 for(const id of[a,b,c,out])await db.query('insert into auth.users(id,email) values($1,$2)',[id,`league-rollback-${id}@example.com`]);
 const {rows:[g]}=await db.query("insert into public.groups(name,owner_id) values('league rollback',$1) returning id",[a]);
 for(const id of[a,b,c])await db.query("insert into public.group_members(group_id,user_id,joined_at) values($1,$2,now()-interval '30 days')",[g.id,id]);
 await asUser(a);const get=async()=> (await db.query('select public.group_league_snapshot($1) data',[g.id])).rows[0].data;
 assert.ok((await get()).every(m=>m.tier===0));
 await db.query('savepoint blocked');await assert.rejects(()=>db.query('update public.group_league_members set tier=5'));await db.query('rollback to savepoint blocked');
 await db.query('reset role');
 // Simulate a closed week. No real users or production dates are modified.
 await db.query("update public.group_league_seasons set current_week=current_week-7 where group_id=$1",[g.id]);
 await db.query("update public.group_league_members set tier=1,eligible_from=eligible_from-7 where group_id=$1",[g.id]);
 await db.query("insert into public.exercise_completions(user_id,for_date,exercise_row_id,exercise_id,sets,reps) values($1,date_trunc('week',now() at time zone 'Asia/Seoul')::date-1,gen_random_uuid(),'squat',10,20),($2,date_trunc('week',now() at time zone 'Asia/Seoul')::date-1,gen_random_uuid(),'squat',3,10)",[a,b]);
 await asUser(a);let result=await get();
 assert.equal(result.find(m=>m.user_id===a).tier,2);assert.equal(result.find(m=>m.user_id===a).last_result,'promotion');
 assert.equal(result.find(m=>m.user_id===b).tier,1);assert.equal(result.find(m=>m.user_id===c).tier,0);
 assert.equal(result.find(m=>m.user_id===c).last_result,'demotion');
 assert.deepEqual(await get(),result); // idempotent refresh
 await db.query('reset role');
 assert.equal((await db.query('select count(*)::int n from public.group_league_results where group_id=$1',[g.id])).rows[0].n,3);
 // Editing a closed week's workout cannot replay a promotion.
 await db.query('delete from public.exercise_completions where user_id=$1',[a]);await asUser(a);assert.deepEqual(await get(),result);
 await asUser(out);await db.query('savepoint denied');await assert.rejects(()=>get());await db.query('rollback to savepoint denied');
 await db.query('rollback');console.log('PASS: weekly promotion, inactivity demotion, middle stays, first-use protection, repeat-read idempotency, settled-history stability, direct-write and outsider denial; fixtures rolled back.');
 if(process.argv.includes('--apply')){await db.query('begin');await db.query(sql);await db.query("notify pgrst,'reload schema'");await db.query('commit');console.log('Weekly league migration applied.');}
}catch(e){await db.query('rollback');throw e;}finally{await db.end();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
