import { randomUUID } from "node:crypto";

import type pg from "pg";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { hasDbCreds, makeClient } from "./db";

/**
 * 커뮤니티 4-2(2026-09-30, supabase/migrations/202609300006_community_4_2.sql) — 라이브 DB.
 * 답글 · 답변 채택(자동 해결됨) · 답글/채택 알림 · 질문 운동 태그 · 작성자 프로필.
 * 🔴 테스트마다 트랜잭션 하나 — 끝나면 전부 롤백.
 */

const d = hasDbCreds ? describe : describe.skip;

d("커뮤니티 4-2 — DB 규칙", () => {
  let c: pg.Client;
  const A = randomUUID(); // 질문자
  const B = randomUUID();
  const C = randomUUID();
  const G = randomUUID(); // 그룹

  async function as(uid: string) {
    await c.query("reset role");
    await c.query(
      `select set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claim.role', 'authenticated', true),
              set_config('request.jwt.claims', $2, true)`,
      [uid, JSON.stringify({ sub: uid, role: "authenticated" })],
    );
    await c.query("set local role authenticated");
  }
  async function expectError(sql: string, params: unknown[] = []): Promise<string> {
    await c.query("savepoint s");
    try {
      await c.query(sql, params);
    } catch (e) {
      await c.query("rollback to savepoint s");
      return (e as Error).message;
    }
    await c.query("release savepoint s");
    throw new Error(`막혀야 하는데 통과함: ${sql}`);
  }
  async function question(uid: string, title = "무릎이 아파요", tag: string | null = null): Promise<string> {
    await as(uid);
    const { rows } = await c.query(
      `insert into public.community_posts (user_id, post_type, title, exercise_tag, visibility) values ($1, 'question', $2, $3, 'public') returning id`,
      [uid, title, tag],
    );
    return rows[0].id;
  }
  async function comment(uid: string, pid: string, body: string, parent: string | null = null): Promise<string> {
    await as(uid);
    const { rows } = await c.query(
      `insert into public.community_comments (post_id, user_id, body, parent_id) values ($1, $2, $3, $4) returning id, parent_id`,
      [pid, uid, body, parent],
    );
    return rows[0].id;
  }
  async function notes(uid: string) {
    await as(uid);
    return (await c.query(`select kind, actor_name, preview from public.community_notifications order by kind, preview`)).rows;
  }

  beforeEach(async () => {
    c = makeClient();
    await c.connect();
    await c.query("begin");
    for (const [id, nick] of [[A, "에이"], [B, "비"], [C, "씨"]] as const) {
      await c.query(`insert into auth.users (id, email, aud, role) values ($1, $2, 'authenticated', 'authenticated')`, [id, `p42-${id}@example.com`]);
      await c.query(
        `insert into public.profiles (user_id, gender, experience, nickname) values ($1, 'male', 'beginner', $2)
         on conflict (user_id) do update set nickname = excluded.nickname`,
        [id, nick],
      );
    }
    await c.query(`insert into public.groups (id, name, owner_id) values ($1, '4-2 그룹', $2)`, [G, A]);
    await c.query(`insert into public.group_members (group_id, user_id) values ($1, $2) on conflict do nothing`, [G, A]);
  });

  afterEach(async () => {
    await c.query("rollback").catch(() => {});
    await c.end();
  });

  it("🔴 답글은 한 단계 — 답글의 답글은 같은 부모로, 다른 글의 댓글엔 못 단다", async () => {
    const q = await question(A);
    const other = await question(A, "다른 질문");
    const top = await comment(B, q, "발끝 방향");
    const r1 = await comment(C, q, "@비 맞아요", top);
    await as(C);
    const r2 = await c.query(`insert into public.community_comments (post_id, user_id, body, parent_id) values ($1, $2, '답글의 답글', $3) returning parent_id`, [q, C, r1]);
    expect(r2.rows[0].parent_id).toBe(top);
    expect(
      await expectError(`insert into public.community_comments (post_id, user_id, body, parent_id) values ($1, $2, 'x', $3)`, [other, C, top]),
    ).toContain("찾을 수 없어요");
  });

  it("🔴 답글 알림 — 부모 댓글 쓴 사람에게 reply, 글쓴이에게 comment(글쓴이 댓글에 단 답글이면 reply 하나만)", async () => {
    const q = await question(A);
    const b1 = await comment(B, q, "비의 답");
    await comment(C, q, "씨의 답글", b1);
    expect(await notes(B)).toEqual([{ kind: "reply", actor_name: "씨", preview: "씨의 답글" }]);
    expect((await notes(A)).map((n) => n.preview)).toEqual(["비의 답", "씨의 답글"]);
    // 글쓴이 댓글에 단 답글 → 글쓴이는 reply 하나만.
    const a1 = await comment(A, q, "에이의 추가 설명");
    await comment(B, q, "비의 답글", a1);
    const forA = (await notes(A)).filter((n) => n.preview === "비의 답글");
    expect(forA).toEqual([{ kind: "reply", actor_name: "비", preview: "비의 답글" }]);
  });

  it("🔴 채택 — 작성자만, 그 글의 남 댓글만, 채택하면 자동 해결됨 + 답변자에게 알림", async () => {
    const q = await question(A, "벤치 어깨 통증");
    const other = await question(A, "다른 질문");
    const b1 = await comment(B, q, "견갑을 모아요");
    const a1 = await comment(A, q, "내 댓글");
    const bOther = await comment(B, other, "다른 글 답");
    await as(A);
    expect(await expectError(`update public.community_posts set accepted_comment_id = $2 where id = $1`, [q, a1])).toContain("채택할 수 있어요");
    expect(await expectError(`update public.community_posts set accepted_comment_id = $2 where id = $1`, [q, bOther])).toContain("채택할 수 있어요");
    // 남의 질문은 채택 못 함(수정 권한 없음 → 0행).
    await as(C);
    expect((await c.query(`update public.community_posts set accepted_comment_id = $2 where id = $1`, [q, b1])).rowCount).toBe(0);
    await as(A);
    await c.query(`update public.community_posts set accepted_comment_id = $2 where id = $1`, [q, b1]);
    const post = (await c.query(`select resolved_at, accepted_comment_id from public.community_posts where id = $1`, [q])).rows[0];
    expect(post.accepted_comment_id).toBe(b1);
    expect(post.resolved_at).not.toBeNull();
    expect((await notes(B)).filter((n) => n.kind === "accepted")).toEqual([{ kind: "accepted", actor_name: "에이", preview: "벤치 어깨 통증" }]);
    // 사진 글은 채택 없음.
    await as(A);
    const { rows } = await c.query(`insert into public.community_posts (user_id, photo_url, visibility) values ($1, 'https://x/p.jpg', 'public') returning id`, [A]);
    expect(await expectError(`update public.community_posts set exercise_tag = '스쿼트' where id = $1`, [rows[0].id])).toMatch(/check constraint/);
  });

  it("질문 태그 — 검색·태그 칩, '답변 기다리는'은 답변 0개 먼저", async () => {
    const answered = await question(A, "답이 달린 질문", "스쿼트");
    await comment(B, answered, "답");
    const fresh = await question(A, "아직 답 없는 질문", "스쿼트");
    await question(A, "데드 질문", "데드리프트");
    await as(C);
    const open = (await c.query(`select id, score from public.community_feed_page('question_open')`)).rows;
    const iFresh = open.findIndex((r) => r.id === fresh);
    const iAnswered = open.findIndex((r) => r.id === answered);
    expect(iFresh).toBeGreaterThanOrEqual(0);
    expect(iFresh).toBeLessThan(iAnswered);
    expect((await c.query(`select id from public.community_feed_page('question', '스쿼트')`)).rows.map((r) => r.id)).toEqual(
      expect.arrayContaining([answered, fresh]),
    );
    const tags = (await c.query(`select tag, n from public.community_question_tags(20)`)).rows;
    expect(Number(tags.find((t) => t.tag === "스쿼트")?.n)).toBeGreaterThanOrEqual(2);
  });

  it("🔴 작성자 프로필 — 내가 볼 수 있는 글만(그룹 전용 글은 그룹 밖에서 안 보임)", async () => {
    await as(A);
    const pub = (await c.query(`insert into public.community_posts (user_id, photo_url, visibility) values ($1, 'https://x/p.jpg', 'public') returning id`, [A])).rows[0].id;
    const grp = (await c.query(`insert into public.community_posts (user_id, photo_url, visibility, group_id) values ($1, 'https://x/g.jpg', 'group', $2) returning id`, [A, G])).rows[0].id;
    await as(C);
    const seen = (await c.query(`select id from public.community_author_posts($1)`, [A])).rows.map((r) => r.id);
    expect(seen).toContain(pub);
    expect(seen).not.toContain(grp);
    const stats = (await c.query(`select month_posts, accepted_answers from public.community_author_stats($1)`, [A])).rows[0];
    expect(Number(stats.month_posts)).toBe(1);
    await as(A);
    expect((await c.query(`select id from public.community_author_posts($1)`, [A])).rows.map((r) => r.id)).toEqual(expect.arrayContaining([pub, grp]));
  });
});
