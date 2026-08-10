import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { hasDbCreds, makeClient } from "./db";

/**
 * SCHEMA DRIFT GUARD — the single most important BE test.
 *
 * Every "빵꾸" we hit (7일 루틴 splits 제약, 피라미드 set_details 컬럼) was the SAME
 * root cause: a migration written into supabase/schema.sql but never applied to the
 * LIVE Supabase DB. This test parses schema.sql and asserts the live DB has every
 * table, every column, and every CHECK constraint it declares. If it fails, a
 * migration is pending — apply schema.sql (or the missing DDL) to the live DB.
 *
 * Read-only. Skips automatically when test DB creds (.env.test.local) are absent.
 */
const SCHEMA_PATH = resolve(dirname(fileURLToPath(import.meta.url)), "../../supabase/schema.sql");

type Expected = { tables: Record<string, Set<string>>; checks: Record<string, string> };

function parseSchema(sql: string): Expected {
  const tables: Record<string, Set<string>> = {};
  const add = (t: string, c: string) => ((tables[t] ??= new Set()).add(c));

  // create table blocks → column names
  const ctRe = /create table if not exists public\.(\w+)\s*\(([\s\S]*?)\n\);/g;
  let m: RegExpExecArray | null;
  while ((m = ctRe.exec(sql))) {
    const table = m[1];
    tables[table] ??= new Set();
    for (let line of m[2].split("\n")) {
      line = line.trim().replace(/,$/, "");
      if (!line || line.startsWith("--")) continue;
      const w = line.match(/^"?([a-z_][a-z0-9_]*)"?\s+/i);
      if (!w) continue;
      const col = w[1].toLowerCase();
      if (["primary", "unique", "foreign", "check", "constraint", "references"].includes(col)) continue;
      add(table, col);
    }
  }
  // alter add column
  const acRe = /alter table public\.(\w+)\s+add column if not exists\s+(\w+)/gi;
  while ((m = acRe.exec(sql))) add(m[1], m[2].toLowerCase());

  // check constraints
  const checks: Record<string, string> = {};
  const chRe = /add constraint\s+(\w+)\s+check\s*\(([\s\S]*?)\)\s*;/gi;
  while ((m = chRe.exec(sql))) checks[m[1]] = m[2].replace(/\s+/g, " ").trim();

  return { tables, checks };
}

const schemaSql = readFileSync(SCHEMA_PATH, "utf8");
const expected = parseSchema(schemaSql);
const expectedSwapBody = schemaSql.match(
  /create or replace function public\.swap_custom_arm_routine\([\s\S]*?\) returns void[\s\S]*?as \$\$([\s\S]*?)\$\$;/i,
)?.[1];

function normalizeSql(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

describe.skipIf(!hasDbCreds)("schema-sync: supabase/schema.sql ↔ live DB", () => {
  let client: ReturnType<typeof makeClient>;
  let liveTables: Set<string>;
  const liveColsCache: Record<string, Set<string>> = {};

  beforeAll(async () => {
    client = makeClient();
    await client.connect();
    const t = await client.query(
      `select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE'`,
    );
    liveTables = new Set(t.rows.map((r) => r.table_name));
  });
  afterAll(async () => { await client?.end(); });

  async function liveCols(table: string): Promise<Set<string>> {
    if (!liveColsCache[table]) {
      const r = await client.query(
        `select column_name from information_schema.columns where table_schema='public' and table_name=$1`,
        [table],
      );
      liveColsCache[table] = new Set(r.rows.map((x) => x.column_name));
    }
    return liveColsCache[table];
  }

  it("declares at least one table to check (sanity)", () => {
    expect(Object.keys(expected.tables).length).toBeGreaterThan(3);
  });

  it("swap_custom_arm_routine has the exact body, search_path, and ACL", async () => {
    const result = await client.query(
      `select
         expected.oid is not null as exists,
         pg_get_function_result(expected.oid) as return_type,
         language.lanname as language,
         coalesce(proc.prosecdef, false) as security_definer,
         pg_get_functiondef(expected.oid) as function_definition,
         proc.prosrc as function_body,
         proc.proconfig as function_config,
         has_function_privilege('authenticated', expected.oid, 'EXECUTE')
           as authenticated_execute,
         has_function_privilege('anon', expected.oid, 'EXECUTE')
           as anon_execute,
         coalesce((
           select bool_or(acl.grantee = 0 and acl.privilege_type = 'EXECUTE')
             from aclexplode(
               coalesce(proc.proacl, acldefault('f', proc.proowner))
             ) as acl
         ), false) as public_execute
       from (
         select to_regprocedure(
           'public.swap_custom_arm_routine(integer,integer,jsonb,timestamp with time zone)'
         ) as oid
       ) as expected
       left join pg_proc as proc on proc.oid = expected.oid
       left join pg_language as language on language.oid = proc.prolang`,
    );
    const row = result.rows[0];
    expect(row, "swap_custom_arm_routine RPC missing in live DB").toMatchObject({
      exists: true,
      return_type: "void",
      language: "plpgsql",
      security_definer: false,
      function_config: ["search_path=public, pg_temp"],
      authenticated_execute: true,
      anon_execute: false,
      public_execute: false,
    });
    expect(row.function_definition).toMatch(
      /create or replace function public\.swap_custom_arm_routine[\s\S]*set search_path to 'public', 'pg_temp'/i,
    );
    expect(expectedSwapBody, "schema.sql swap body missing").toBeTruthy();
    expect(normalizeSql(row.function_body)).toBe(normalizeSql(expectedSwapBody!));
  });

  it("shared exercise replacement RPC and parent lock trigger are deployed", async () => {
    const result = await client.query(
      `select
         to_regprocedure(
           'public.replace_routine_exercise_groups(timestamp with time zone,boolean,jsonb)'
         ) is not null as replacement_exists,
         exists (
           select 1
             from pg_trigger
            where tgrelid = 'public.routine_exercises'::regclass
              and tgname = 'routine_exercises_lock_parent'
              and not tgisinternal
         ) as lock_trigger_exists`,
    );
    expect(result.rows[0]).toEqual({
      replacement_exists: true,
      lock_trigger_exists: true,
    });
  });

  for (const table of Object.keys(expected.tables).sort()) {
    it(`table public.${table} exists with all declared columns`, async () => {
      expect(liveTables.has(table), `table ${table} missing from live DB`).toBe(true);
      const live = await liveCols(table);
      const missing = [...expected.tables[table]].filter((c) => !live.has(c));
      expect(missing, `${table} missing columns: ${missing.join(", ")}`).toEqual([]);
    });
  }

  for (const [name, def] of Object.entries(expected.checks)) {
    it(`check constraint ${name} is present on live DB`, async () => {
      const r = await client.query(
        `select pg_get_constraintdef(oid) d from pg_constraint where conname=$1`,
        [name],
      );
      expect(r.rows[0]?.d, `constraint ${name} absent (schema declares: check (${def}))`).toBeTruthy();
    });
  }
});
