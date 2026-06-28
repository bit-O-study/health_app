import { readFileSync } from "node:fs";
import pg from "pg";

function loadEnv() {
  const out = {};
  for (const line of readFileSync(".env.test.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#")) out[m[1]] = m[2];
  }
  return out;
}
const env = { ...loadEnv(), ...process.env };
const c = new pg.Client({
  host: env.SUPA_DB_HOST,
  port: Number(env.SUPA_DB_PORT ?? 5432),
  user: `postgres.${env.SUPA_DB_REF}`,
  password: env.SUPA_DB_PW,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});

const A = "25dcd100-fb9f-490f-a678-9c5327976bdd";
const B = "dd8c5571-3782-4820-8a76-da4ef5518215";

const main = async () => {
  await c.connect();

  const seoulToday = (await c.query(
    `select to_char((now() at time zone 'Asia/Seoul')::date,'YYYY-MM-DD') d`,
  )).rows[0].d;
  console.log("seoul today =", seoulToday);

  for (const [lbl, uid] of [["A", A], ["B", B]]) {
    const food = await c.query(
      `select count(*)::int n, count(*) filter (where for_date=$2)::int today
       from public.food_logs where user_id=$1`,
      [uid, seoulToday],
    );
    const ex = await c.query(
      `select count(*) filter (where for_date=$2 and status='done')::int today_done,
              max(for_date)::text last
       from public.exercise_completions where user_id=$1`,
      [uid, seoulToday],
    );
    console.log(`${lbl} ${uid}: food total=${food.rows[0].n} today=${food.rows[0].today} | ex today_done=${ex.rows[0].today_done} lastWorkout=${ex.rows[0].last}`);
  }

  // food_logs RLS: can B see A's food rows?
  await c.query("begin");
  await c.query("set local role authenticated");
  await c.query(
    `select set_config('request.jwt.claims', json_build_object('sub',$1::text,'role','authenticated')::text, true)`,
    [B],
  );
  const vis = await c.query(`select count(*)::int n from public.food_logs where user_id=$1`, [A]);
  console.log(`B sees A food_logs: ${vis.rows[0].n}`);
  await c.query("rollback");

  await c.end();
};
main().catch((e) => { console.error("❌", e.message); process.exit(1); });
