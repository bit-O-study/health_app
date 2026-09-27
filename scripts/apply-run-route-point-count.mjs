import { readFileSync } from 'node:fs';
import pg from 'pg';
const env={};for(const line of readFileSync('.env.test.local','utf8').split(/\r?\n/)){const m=line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)env[m[1]]=m[2];}
const db=new pg.Client({host:env.SUPA_DB_HOST,port:Number(env.SUPA_DB_PORT||5432),user:`postgres.${env.SUPA_DB_REF}`,password:env.SUPA_DB_PW,database:'postgres',ssl:{rejectUnauthorized:false},connectionTimeoutMillis:10000});
try{await db.connect();await db.query('begin');await db.query(readFileSync('supabase/migrations/202609270001_run_route_point_count.sql','utf8'));await db.query('commit');console.log('Run route point count migration applied.');}catch(e){await db.query('rollback');console.error(e.message);process.exitCode=1;}finally{await db.end();}