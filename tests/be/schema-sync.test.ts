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

const expected = parseSchema(readFileSync(SCHEMA_PATH, "utf8"));

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

  it("function public.swap_custom_arm_routine(integer,integer,jsonb) exists", async () => {
    const result = await client.query(
      `select to_regprocedure(
       'public.swap_custom_arm_routine(integer,integer,jsonb)'
     ) is not null as exists`,
    );
    expect(
      result.rows[0]?.exists,
      "swap_custom_arm_routine RPC missing from live DB",
    ).toBe(true);
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
