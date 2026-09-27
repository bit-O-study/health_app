import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const dir = join(process.cwd(), "supabase/migrations");
const files = readdirSync(dir).filter((file) => file.endsWith(".sql")).sort();
const baseline = readFileSync(join(dir, "202609190000_initial_schema.sql"), "utf8");

describe("fresh Preview migration history", () => {
  it("uses a unique version for every migration", () => {
    const versions = files.map((file) => file.split("_")[0]);
    expect(new Set(versions).size).toBe(versions.length);
  });
  it("creates the base schema before incremental trainer migrations", () => {
    expect(files[0]).toBe("202609190000_initial_schema.sql");
    for (const table of ["routine_exercises", "profiles", "groups", "group_members", "member_share_prefs"]) {
      expect(baseline).toContain(`create table if not exists public.${table} (`);
    }
    expect(baseline.indexOf("function public.is_post_moderator()")).toBeLessThan(baseline.indexOf("create table if not exists public.groups ("));
  });
  it("does not replay old policies over an existing or partial database", () => {
    expect(baseline).toContain("if to_regclass('public.routine_exercises') is not null then return; end if;");
    expect(baseline.indexOf("raise exception 'Initial schema requires an empty public schema")).toBeLessThan(baseline.indexOf("execute $schema$"));
    expect(baseline).toContain("if to_regprocedure('public.rls_auto_enable()') is not null then");
  });
});
