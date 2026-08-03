import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const schema = readFileSync(resolve(process.cwd(), "supabase/schema.sql"), "utf8");
const rpc = schema.match(
  /create or replace function public\.swap_custom_arm_routine[\s\S]*?grant execute on function public\.swap_custom_arm_routine[\s\S]*?authenticated;/i,
)?.[0] ?? "";

describe("swap_custom_arm_routine schema contract", () => {
  it("인증 사용자에게만 SECURITY INVOKER 함수로 노출한다", () => {
    expect(rpc).toContain("security invoker");
    expect(rpc).toContain("auth.uid()");
    expect(rpc).toContain("revoke all on function");
    expect(rpc).toContain("grant execute on function");
  });

  it("루틴 행을 잠그고 예상 스냅샷을 비교한다", () => {
    expect(rpc).toMatch(/from public\.user_routines[\s\S]*for update/i);
    expect(rpc).toContain("STALE_ROUTINE");
  });

  it("팔 행과 custom_week를 같은 함수에서 갱신한다", () => {
    expect(rpc).toMatch(/update public\.routine_exercises[\s\S]*case/i);
    expect(rpc).toMatch(/focus = 'arm'/i);
    expect(rpc).toMatch(/update public\.user_routines[\s\S]*custom_week/i);
  });
});
