import { describe, expect, it } from "vitest";
import { expectedFunctionAccess, expectedPolicies } from "../schema-permissions";
describe("final schema permissions", () => {
 it("a later revoke overrides a historical grant", () => {
  const sql = "grant execute on function public.old_rpc(uuid) to authenticated; revoke all on function public.old_rpc(uuid) from public, anon, authenticated; grant execute on function public.new_rpc(uuid) to authenticated;";
  expect([...expectedFunctionAccess(sql)]).toEqual([["old_rpc",false],["new_rpc",true]]);
 });
 it("only removes the dropped policy on its own table and supports recreation", () => {
  const sql = 'create policy "own" on public.a for select using(true); create policy "own" on public.b for select using(true); drop policy if exists "own" on public.a; create policy restored on public.a for select using(true);';
  expect(expectedPolicies(sql)).toEqual([{name:"own",table:"b"},{name:"restored",table:"a"}]);
 });
});
