import { randomUUID } from "node:crypto";

import type pg from "pg";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { hasDbCreds, makeClient } from "./db";

/**
 * 커뮤니티 3단계(2026-09-30, supabase/migrations/202609300004_community_phase3.sql) — 라이브 DB.
 * 차단 · 신고 누적 숨김 · 앱 안 알림 · 저장 · 질문 글 · 좋아요 하루 묶음.
 * 🔴 테스트마다 트랜잭션 하나 — 끝나면 전부 롤백이라 라이브에 아무것도 남지 않는다.
 */

const d = hasDbCreds ? describe : describe.skip;

d("커뮤니티 3단계 — DB 규칙", () => {
  let c: pg.Client;
  const A = randomUUID(); // 글쓴이
  const B = randomUUID();
  const C = randomUUID();
  const D = randomUUID();

  async function as(uid: string, role: "authenticated" | "service_role" = "authenticated") {
    await c.query("reset role");
    await c.query(
      `select set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claim.role', $2, true),
              set_config('request.jwt.claims', $3, true)`,
      [uid, role, JSON.stringify({ sub: uid, role })],
    );
    await c.query(`set local role ${role}`);
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
  async function post(uid: string, extra = ""): Promise<string> {
    await as(uid);
    const { rows } = await c.query(
      `insert into public.community_posts (user_id, photo_url, visibility, caption) values ($1, 'https://x/p.jpg', 'public', $2) returning id`,
      [uid, `글 ${extra}`],
    );
    return rows[0].id;
  }
  async function sees(uid: string, pid: string): Promise<boolean> {
    await as(uid);
    return (await c.query(`select 1 from public.community_posts where id = $1`, [pid])).rowCount === 1;
  }

  beforeEach(async () => {
    c = makeClient();
    await c.connect();
    await c.query("begin");
    for (const [id, nick] of [[A, "에이"], [B, "비"], [C, "씨"], [D, "디"]] as const) {
      await c.query(`insert into auth.users (id, email, aud, role) values ($1, $2, 'authenticated', 'authenticated')`, [
        id,
        `p3-${id}@example.com`,
      ]);
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

  it("🔴 차단하면 서로의 글·댓글이 안 보이고 댓글도 못 단다(어느 쪽이 막았든)", async () => {
    const pa = await post(A);
    const pb = await post(B);
    await as(B);
    await c.query(`insert into public.community_comments (post_id, user_id, body) values ($1, $2, '차단 전 댓글')`, [pa, B]);

    await as(A);
    const blk = await c.query(`insert into public.user_blocks (blocker_id, blocked_id) values ($1, $2) returning blocked_name`, [A, B]);
    expect(blk.rows[0].blocked_name).toBe("비");

    expect(await sees(A, pb)).toBe(false);
    expect(await sees(B, pa)).toBe(false); // 막힌 쪽에서도
    expect(await sees(C, pa)).toBe(true); // 다른 사람은 그대로
    await as(A);
    expect((await c.query(`select count(*)::int n from public.community_comments where post_id = $1`, [pa])).rows[0].n).toBe(0);
    await as(B);
    expect(
      await expectError(`insert into public.community_comments (post_id, user_id, body) values ($1, $2, '차단 뒤')`, [pa, B]),
    ).toMatch(/row-level security/);
    // 🔴 남의 차단 목록은 못 본다.
    await as(C);
    expect((await c.query(`select count(*)::int n from public.user_blocks`)).rows[0].n).toBe(0);
    // 풀면 다시 보인다.
    await as(A);
    await c.query(`delete from public.user_blocks where blocker_id = $1 and blocked_id = $2`, [A, B]);
    expect(await sees(A, pb)).toBe(true);
  });

  it("🔴 서로 다른 3명이 신고하면 숨김(작성자·관리자에겐 보임), 관리자가 처리완료하면 다시 보임", async () => {
    const pa = await post(A);
    for (const r of [B, C]) {
      await as(r);
      await c.query(
        `insert into public.post_reports (target_kind, target_id, reporter_id, reason) values ('community_post', $1, $2, '스팸')`,
        [pa, r],
      );
    }
    expect(await sees(D, pa)).toBe(true); // 2명까지는 그대로
    await as(D);
    await c.query(
      `insert into public.post_reports (target_kind, target_id, reporter_id, reason) values ('community_post', $1, $2, '스팸')`,
      [pa, D],
    );
    expect(await sees(D, pa)).toBe(false);
    expect(await sees(A, pa)).toBe(true); // 작성자 본인
    // 🔴 작성자가 스스로 숨김을 풀 수 없다.
    await as(A);
    expect(await expectError(`update public.community_posts set hidden_at = null where id = $1`, [pa])).toContain("한마디만");
    // 관리자(서비스 롤) 처리완료 → 미처리 신고가 0 → 다시 보임.
    await as(A, "service_role");
    await c.query(`update public.post_reports set status = 'resolved' where target_id = $1`, [pa]);
    expect(await sees(D, pa)).toBe(true);
  });

  it("🔴 댓글 알림 — 글쓴이에게 한 건(자기 댓글·차단 사이는 없음), 댓글을 지우면 알림도 지워짐", async () => {
    const pa = await post(A);
    await as(B);
    const cm = await c.query(`insert into public.community_comments (post_id, user_id, body) values ($1, $2, '멋져요') returning id`, [pa, B]);
    await as(A);
    await c.query(`insert into public.community_comments (post_id, user_id, body) values ($1, $2, '고마워요')`, [pa, A]);
    const mine = await c.query(`select kind, actor_name, preview, read_at from public.community_notifications`);
    expect(mine.rows).toEqual([{ kind: "comment", actor_name: "비", preview: "멋져요", read_at: null }]);
    // 🔴 남의 알림은 못 본다 · 직접 만들 수 없다.
    await as(C);
    expect((await c.query(`select count(*)::int n from public.community_notifications`)).rows[0].n).toBe(0);
    expect(
      await expectError(`insert into public.community_notifications (user_id, kind) values ($1, 'comment')`, [A]),
    ).toMatch(/row-level security/);
    // 읽음 표시.
    await as(A);
    await c.query(`select public.mark_community_notifications_read(null)`);
    expect((await c.query(`select count(*)::int n from public.community_notifications where read_at is null`)).rows[0].n).toBe(0);
    // 댓글 삭제 → 알림 삭제.
    await as(B);
    await c.query(`delete from public.community_comments where id = $1`, [cm.rows[0].id]);
    await as(A);
    expect((await c.query(`select count(*)::int n from public.community_notifications`)).rows[0].n).toBe(0);
    // 차단 사이면 알림이 안 생긴다.
    await c.query(`insert into public.user_blocks (blocker_id, blocked_id) values ($1, $2)`, [A, C]);
    const pc = await post(C);
    await as(A);
    expect(await expectError(`insert into public.community_comments (post_id, user_id, body) values ($1, $2, 'x')`, [pc, A])).toMatch(
      /row-level security/,
    );
  });

  it("🔴 저장 — 내 저장만 보이고, 저장한 글 보기에 나온다", async () => {
    const pa = await post(A);
    await as(B);
    await c.query(`insert into public.community_saves (post_id) values ($1)`, [pa]);
    expect((await c.query(`select id from public.community_feed_page('saved')`)).rows.map((r) => r.id)).toEqual([pa]);
    await as(C);
    expect((await c.query(`select count(*)::int n from public.community_saves`)).rows[0].n).toBe(0);
    expect((await c.query(`select id from public.community_feed_page('saved')`)).rowCount).toBe(0);
  });

  it("🔴 질문 글 — 사진 없이 제목+본문, 종류는 못 바꾸고, 해결됨 표시는 된다", async () => {
    await as(A);
    const q = await c.query(
      `insert into public.community_posts (user_id, post_type, title, caption, visibility)
       values ($1, 'question', '스쿼트 무릎', $2, 'public') returning id`,
      [A, "가".repeat(900)],
    );
    const qid = q.rows[0].id;
    // 사진 글에는 제목을 못 붙인다 · 질문은 제목이 있어야.
    expect(
      await expectError(
        `insert into public.community_posts (user_id, post_type, caption, visibility) values ($1, 'question', '제목 없음', 'public')`,
        [A],
      ),
    ).toMatch(/check constraint/);
    expect(await expectError(`update public.community_posts set post_type = 'photo' where id = $1`, [qid])).toContain("한마디만");
    const open = async () => (await c.query(`select id from public.community_feed_page('question_open')`)).rows.map((r) => r.id);
    expect(await open()).toContain(qid);
    expect((await c.query(`select id from public.community_feed_page('workout')`)).rows.map((r) => r.id)).not.toContain(qid);
    await c.query(`update public.community_posts set resolved_at = now() where id = $1`, [qid]);
    expect(await open()).not.toContain(qid);
    expect((await c.query(`select id from public.community_feed_page('question', '무릎')`)).rows.map((r) => r.id)).toContain(qid);
  });

  it("좋아요 하루 묶음 — 글쓴이별 한 건(자기 좋아요 제외), 다시 돌려도 새로 안 만든다", async () => {
    const pa = await post(A);
    for (const u of [A, B, C]) {
      await as(u);
      await c.query(`insert into public.community_likes (post_id, user_id) values ($1, $2)`, [pa, u]);
    }
    await as(A, "service_role");
    const first = await c.query(`select * from public.community_like_digest(now())`);
    const forA = first.rows.filter((r) => r.user_id === A);
    expect(forA).toEqual([{ user_id: A, like_count: 2, post_id: pa, teaching_post_id: null }]);
    const again = await c.query(`select * from public.community_like_digest(now())`);
    expect(again.rows.filter((r) => r.user_id === A)).toEqual([]);
    // 🔴 사용자는 부를 수 없다(아무나 알림을 찍어 낼 수 없게).
    await as(A);
    expect(await expectError(`select * from public.community_like_digest(now())`)).toMatch(/permission denied/);
  });
});
