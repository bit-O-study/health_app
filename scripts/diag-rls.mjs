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

const main = async () => {
  await c.connect();

  console.log("=== policies on group-shared tables ===");
  const pol = await c.query(`
    select tablename, policyname, cmd
    from pg_policies
    where schemaname='public'
      and tablename in ('exercise_completions','conditioning_completions','food_logs','profiles','group_members','groups')
    order by tablename, policyname`);
  for (const r of pol.rows) console.log(`${r.tablename} | ${r.policyname} | ${r.cmd}`);

  console.log("\n=== helper functions ===");
  const fn = await c.query(`
    select proname, prosecdef from pg_proc
    where proname in ('shares_group_with','is_group_member','join_group_by_token')`);
  for (const r of fn.rows) console.log(`${r.proname} secdef=${r.prosecdef}`);

  console.log("\n=== groups with >=2 members ===");
  const g = await c.query(`
    select group_id, count(*) n, array_agg(user_id::text) ids
    from public.group_members group by group_id having count(*) >= 2 limit 3`);
  for (const r of g.rows) console.log(`group ${r.group_id} n=${r.n} ids=${r.ids}`);

  if (g.rows.length) {
    const [a, b] = g.rows[0].ids;
    console.log(`\n=== RLS impersonation: as ${b}, read ${a}'s rows ===`);
    for (const t of ["exercise_completions", "conditioning_completions", "food_logs", "profiles"]) {
      try {
        await c.query("begin");
        await c.query("set local role authenticated");
        await c.query(
          `select set_config('request.jwt.claims', json_build_object('sub',$1::text,'role','authenticated')::text, true)`,
          [b],
        );
        const r = await c.query(`select count(*)::int n from public.${t} where user_id=$1`, [a]);
        console.log(`${t}: ${r.rows[0].n} rows visible`);
        await c.query("rollback");
      } catch (e) {
        await c.query("rollback");
        console.log(`${t}: ERROR ${e.message}`);
      }
    }
  }

  await c.end();
};
main().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
