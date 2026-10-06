import { randomUUID } from "node:crypto";

import type pg from "pg";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { hasDbCreds, makeClient } from "./db";

/**
 * 커뮤니티 4-1(2026-09-30, supabase/migrations/202609300005_community_4_1.sql) — '댓글 단 글' 보기. 라이브 DB.
 * 🔴 테스트마다 트랜잭션 하나 — 끝나면 전부 롤백.
 */

const d = hasDbCreds ? describe : describe.skip;

d("커뮤니티 4-1 — 댓글 단 글", () => {
  let c: pg.Client;
  const A = randomUUID(); // 글쓴이
  const B = randomUUID(); // 댓글 단 사람
  const C = randomUUID();

  async function as(uid: string) {
    await c.query("reset role");
    await c.query(
      `select set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claim.role', 'authenticated', true),
              set_config('request.jwt.claims', $2, true)`,
      [uid, JSON.stringify({ sub: uid, role: "authenticated" })],
    );
    await c.query("set local role authenticated");
  }
  const view = async (uid: string) => {
    await as(uid);
    return (await c.query(`select id, kind from public.community_feed_page('commented')`)).rows as { id: string; kind: string }[];
  };

  beforeEach(async () => {
    c = makeClient();
    await c.connect();
    await c.query("begin");
    for (const [id, nick] of [[A, "에이"], [B, "비"], [C, "씨"]] as const) {
      await c.query(`insert into auth.users (id, email, aud, role) values ($1, $2, 'authenticated', 'authenticated')`, [id, `p41-${id}@example.com`]);
      await c.query(
        `insert into public.profiles (user_id, gender, experience, nickname) values ($1, 'male', 'beginner', $2)
         on conflict (user_id) do update set nickname = excluded.nickname`,
        [id, nick],
      );
    }
  });

  afterEach(async () => {
    await c.query("rollback").catch(() => {});
    await c.end();
  });

  it("🔴 내가 댓글 단 남의 글만(내 글·남이 단 글 제외), 내 마지막 댓글 순, 운동 영상 포함", async () => {
    // 댓글 시각을 정하려고 서비스 롤로 넣는다(트랜잭션 안 now() 는 하나라 순서를 못 정한다).
    const post = async (uid: string) =>
      (await c.query(`insert into public.community_posts (user_id, photo_url, visibility) values ($1, 'https://x/p.jpg', 'public') returning id`, [uid])).rows[0].id as string;
    const p1 = await post(A);
    const p2 = await post(A);
    const own = await post(B);
    const other = await post(A);
    const { rows: t } = await c.query(
      `insert into public.teaching_posts (user_id, visibility, exercise_tag, video_url) values ($1, 'public', '스쿼트', 'https://x/v.mp4') returning id`,
      [A],
    );
    const comment = (pid: string, uid: string, ago: string, table = "community_comments") =>
      c.query(`insert into public.${table} (post_id, user_id, body, created_at) values ($1, $2, '댓글', now() - $3::interval)`, [pid, uid, ago]);
    await comment(p1, B, "3 hours");
    await comment(p2, B, "2 hours");
    await comment(p1, B, "1 hour"); // p1 이 다시 맨 위로
    await comment(own, B, "10 minutes"); // 내 글 — 빠진다
    await comment(other, C, "5 minutes"); // 남이 단 글 — 빠진다
    await comment(t[0].id, B, "30 minutes", "teaching_comments");

    expect(await view(B)).toEqual([
      { id: t[0].id, kind: "teaching" },
      { id: p1, kind: "photo" },
      { id: p2, kind: "photo" },
    ]);
    expect(await view(C)).toEqual([{ id: other, kind: "photo" }]);
    expect(await view(A)).toEqual([]);
  });

  it("🔴 볼 수 없게 된 글(차단)은 댓글 단 글에서도 빠진다", async () => {
    const { rows } = await c.query(
      `insert into public.community_posts (user_id, photo_url, visibility) values ($1, 'https://x/p.jpg', 'public') returning id`,
      [A],
    );
    await c.query(`insert into public.community_comments (post_id, user_id, body) values ($1, $2, '댓글')`, [rows[0].id, B]);
    expect((await view(B)).map((r) => r.id)).toEqual([rows[0].id]);
    await as(A);
    await c.query(`insert into public.user_blocks (blocker_id, blocked_id) values ($1, $2)`, [A, B]);
    expect(await view(B)).toEqual([]);
  });
});
