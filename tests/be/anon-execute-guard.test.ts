import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { hasDbCreds, makeClient } from "./db";

/**
 * 익명(anon) 실행 권한 가드(라이브 DB) — 2026-09-09.
 *
 * 🔴 Supabase 는 public 스키마 함수에 **anon 실행권한을 기본으로 준다.** 아무것도 안
 * 적으면 로그인도 안 한 사람이 SECURITY DEFINER 함수를 그대로 부를 수 있다.
 * 새 함수를 만들 때마다 회수를 잊기 쉬운데, **화면에는 아무 이상이 없다.**
 *
 * ⚠ `revoke ... from anon` 만으로는 안 빠진다. 기본 권한은 `PUBLIC` 에 붙어 있어서
 *   anon 이 PUBLIC 을 통해 계속 부를 수 있다(실측으로 확인했다). PUBLIC 에서 회수한 뒤
 *   `authenticated` 에게 명시적으로 다시 줘야 한다 — 안 그러면 로그인 사용자까지 막힌다.
 *   이 테스트가 그 양쪽을 다 본다.
 */
describe.skipIf(!hasDbCreds)("익명 실행 권한(라이브 DB)", () => {
  let client: ReturnType<typeof makeClient>;

  beforeAll(async () => {
    client = makeClient();
    await client.connect();
  }, 30_000);
  afterAll(async () => {
    await client?.end();
  });

  async function canRun(role: string, sig: string): Promise<boolean> {
    const r = await client.query(
      `select has_function_privilege($1, $2, 'execute') as ok`,
      [role, sig],
    );
    return r.rows[0]?.ok === true;
  }

  /** 로그인해야만 쓰는 기능 — anon 은 못 부르고, 로그인 사용자는 부를 수 있어야 한다. */
  const LOGGED_IN_ONLY = [
    "public.bump_routine_share_saves(uuid)",
    "public.consume_ai_quota(text, text, int)",
    "public.join_group_by_token(text)",
    "public.debug_feature_enabled(text)",
    "public.is_debug_account()",
    // 트레이너·B2B (이번에 만든 것들)
    "public.trainer_board(uuid, date, date)",
    "public.trainer_member_routine(uuid, uuid)",
    "public.trainer_assign_routine_day(uuid, uuid, int, text, int, text)",
    "public.has_team_premium()",
    "public.billing_deposit_info()",
    "public.search_custom_foods(text, int)",
  ];

  it.each(LOGGED_IN_ONLY)("🔴 익명은 %s 를 못 부른다", async (sig) => {
    expect(await canRun("anon", sig)).toBe(false);
  });

  it.each(LOGGED_IN_ONLY)("로그인 사용자는 %s 를 부를 수 있다", async (sig) => {
    // 회수만 하고 다시 주는 걸 잊으면 **기능이 통째로 죽는다**(PUBLIC 에서 뺐으니까).
    expect(await canRun("authenticated", sig)).toBe(true);
  });

  it("🔴 유지보수 함수는 로그인 사용자도 못 부른다", async () => {
    expect(await canRun("anon", "public.rls_auto_enable()")).toBe(false);
    expect(await canRun("authenticated", "public.rls_auto_enable()")).toBe(false);
  });

  /**
   * 반대쪽 — **회수하면 안 되는 것들.** 이유가 두 가지라 헷갈리기 쉬워서 여기 적어 둔다.
   * 잘못 잠그면 로그인 화면이나 비로그인 조회가 통째로 죽는다.
   */
  const MUST_STAY_OPEN: [string, string][] = [
    ["public.find_login_email(text, text)", "아이디 찾기(로그인 전)"],
    ["public.request_password_otp(text, text)", "비밀번호 인증번호(로그인 전)"],
    [
      "public.verify_otp_and_reset(text, text, text, text)",
      "비밀번호 재설정(로그인 전)",
    ],
    ["public.group_name_by_token(text)", "초대 링크 미리보기(로그인 전)"],
    [
      "public.consume_rate_limit(text, text, bigint, int)",
      "위 흐름들을 보호하는 폭주 제한이 로그인 전에 돈다",
    ],
    ["public.is_admin()", "RLS 정책 안에서 불린다 — 회수하면 anon 조회가 오류"],
    ["public.is_group_member(uuid)", "RLS 정책 안에서 불린다"],
    ["public.is_post_moderator()", "RLS 정책 안에서 불린다"],
    ["public.shares_group_with(uuid)", "RLS 정책 안에서 불린다"],
    ["public.can_see_community_post(uuid)", "RLS 정책 안에서 불린다"],
  ];

  it.each(MUST_STAY_OPEN)("익명이 %s 를 부를 수 있어야 한다 (%s)", async (sig) => {
    expect(await canRun("anon", sig)).toBe(true);
  });

  it("정책이 참조하는 함수는 전부 익명에게 열려 있다 — 빠지면 조회가 통째로 죽는다", async () => {
    // 위 목록을 손으로 관리하다 빠뜨릴 수 있어, 정책 식에서 직접 뽑아 한 번 더 본다.
    const pol = await client.query(
      `select coalesce(qual,'') || ' ' || coalesce(with_check,'') as expr
         from pg_policies where schemaname = 'public'`,
    );
    const exprs = pol.rows.map((r) => r.expr as string).join(" ");
    const fns = await client.query(
      `select p.proname, p.oid::regprocedure::text as sig
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.prosecdef`,
    );
    for (const f of fns.rows as { proname: string; sig: string }[]) {
      if (!exprs.includes(`${f.proname}(`)) continue;
      expect(
        await canRun("anon", f.sig),
        `${f.sig} 는 RLS 정책이 부르는데 익명 실행이 막혔다 — 비로그인 조회가 오류난다`,
      ).toBe(true);
    }
  });
});
