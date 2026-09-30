import { randomUUID } from "node:crypto";

import type pg from "pg";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { findBanned, type BannedWord } from "@/features/community/banned-words";
import { hasDbCreds, makeClient } from "./db";

/**
 * 커뮤니티 4-3(2026-09-30, supabase/migrations/202609300007_community_4_3.sql) — 라이브 DB.
 * 금칙어(직접 쓰기도 막힘·앱과 같은 판정) · 영상·루틴 저장 · 댓글 공감 · 루틴 소개 차단.
 * 🔴 테스트마다 트랜잭션 하나 — 끝나면 전부 롤백.
 */

const d = hasDbCreds ? describe : describe.skip;

d("커뮤니티 4-3 — DB 규칙", () => {
  let c: pg.Client;
  const A = randomUUID();
  const B = randomUUID();
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
  async function post(uid: string, caption = "오늘도 완료"): Promise<string> {
    await as(uid);
    return (
      await c.query(`insert into public.community_posts (user_id, photo_url, visibility, caption) values ($1, 'https://x/p.jpg', 'public', $2) returning id`, [
        uid,
        caption,
      ])
    ).rows[0].id;
  }

  beforeEach(async () => {
    c = makeClient();
    await c.connect();
    await c.query("begin");
    for (const [id, nick] of [[A, "에이"], [B, "비"], [C, "씨"]] as const) {
      await c.query(`insert into auth.users (id, email, aud, role) values ($1, $2, 'authenticated', 'authenticated')`, [id, `p43-${id}@example.com`]);
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

  it("🔴 금칙어 — 앱을 거치지 않은 직접 쓰기도 막힌다(띄어쓰기·기호 끼워 넣기 포함), 예외 단어는 통과", async () => {
    const pid = await post(A);
    await as(B);
    expect(await expectError(`insert into public.community_comments (post_id, user_id, body) values ($1, $2, '시 .발 뭐야')`, [pid, B])).toContain("욕설");
    expect(await expectError(`insert into public.community_comments (post_id, user_id, body) values ($1, $2, '오픈 채팅으로 와요')`, [pid, B])).toContain(
      "연락처",
    );
    await c.query(`insert into public.community_comments (post_id, user_id, body) values ($1, $2, '오늘이 벌크업의 시발점')`, [pid, B]);
    await as(A);
    expect(await expectError(`update public.community_posts set caption = '카지노 홍보' where id = $1`, [pid])).toContain("도박");
    expect(
      await expectError(`insert into public.teaching_posts (user_id, visibility, exercise_tag, video_url, caption) values ($1, 'public', '스쿼트', 'https://x/v.mp4', '야동')`, [A]),
    ).toContain("성적");
    expect(await expectError(`insert into public.routine_shares (user_id, title, caption) values ($1, '병신 루틴', '')`, [A])).toContain("욕설");
  });

  it("🔴 앱 검사와 DB 검사가 같은 판정을 낸다(같은 목록·같은 정규화)", async () => {
    await as(A);
    const words = (await c.query(`select word, category from public.community_banned_words`)).rows as BannedWord[];
    const samples = ["시 발", "ㅅ.ㅂ", "시발점", "시바견 귀여워", "오픈카톡 ㄱㄱ", "OPEN.KAKAO.COM/xyz", "벤치 100kg 성공", "먹튀 검증", "스쿼트 폼 봐주세요", "텔레 그램"];
    for (const s of samples) {
      const db = (await c.query(`select public.community_find_banned($1) cat`, [s])).rows[0].cat as string | null;
      expect(findBanned(s, words), s).toBe(db);
    }
  });

  it("🔴 영상·루틴 저장 — 내 것만 보이고, 볼 수 없는 영상은 못 저장, 저장한 글 보기에 영상도", async () => {
    await as(A);
    const tid = (
      await c.query(`insert into public.teaching_posts (user_id, visibility, exercise_tag, video_url) values ($1, 'public', '스쿼트', 'https://x/v.mp4') returning id`, [A])
    ).rows[0].id;
    const rid = (await c.query(`insert into public.routine_shares (user_id, title) values ($1, '등 루틴') returning id`, [A])).rows[0].id;
    await as(B);
    await c.query(`insert into public.teaching_saves (post_id) values ($1)`, [tid]);
    await c.query(`insert into public.routine_share_saves (share_id) values ($1)`, [rid]);
    expect((await c.query(`select id, kind from public.community_feed_page('saved')`)).rows).toEqual([{ id: tid, kind: "teaching" }]);
    await as(C);
    expect((await c.query(`select count(*)::int n from public.teaching_saves`)).rows[0].n).toBe(0);
    expect((await c.query(`select count(*)::int n from public.routine_share_saves`)).rows[0].n).toBe(0);
    // 차단 사이면 못 저장.
    await as(A);
    await c.query(`insert into public.user_blocks (blocker_id, blocked_id) values ($1, $2)`, [A, C]);
    await as(C);
    expect(await expectError(`insert into public.teaching_saves (post_id) values ($1)`, [tid])).toMatch(/row-level security/);
    expect(await expectError(`insert into public.routine_share_saves (share_id) values ($1)`, [rid])).toMatch(/row-level security/);
  });

  it("🔴 루틴 소개도 차단하면 서로 안 보인다(3단계에서 빠졌던 곳)", async () => {
    await as(A);
    const rid = (await c.query(`insert into public.routine_shares (user_id, title) values ($1, '하체 루틴') returning id`, [A])).rows[0].id;
    await as(B);
    expect((await c.query(`select 1 from public.routine_shares where id = $1`, [rid])).rowCount).toBe(1);
    await c.query(`insert into public.user_blocks (blocker_id, blocked_id) values ($1, $2)`, [B, A]);
    expect((await c.query(`select 1 from public.routine_shares where id = $1`, [rid])).rowCount).toBe(0);
  });

  it("🔴 댓글 공감 — 수와 내가 눌렀나만(누가 눌렀는지 안 보임), 볼 수 없는 댓글엔 못 누름, 중복 불가", async () => {
    const pid = await post(A);
    await as(B);
    const cid = (await c.query(`insert into public.community_comments (post_id, user_id, body) values ($1, $2, '좋은 답') returning id`, [pid, B])).rows[0].id;
    await as(A);
    await c.query(`insert into public.comment_likes (comment_id) values ($1)`, [cid]);
    expect(await expectError(`insert into public.comment_likes (comment_id) values ($1)`, [cid])).toMatch(/duplicate key/);
    await as(C);
    await c.query(`insert into public.comment_likes (comment_id) values ($1)`, [cid]);
    expect((await c.query(`select count(*)::int n from public.comment_likes`)).rows[0].n).toBe(1); // 내 것만 보인다
    expect((await c.query(`select like_count, liked_by_me from public.comment_like_counts($1)`, [[cid]])).rows[0]).toEqual({
      like_count: 2,
      liked_by_me: true,
    });
    // 댓글 쓴 사람을 차단하면 그 댓글엔 못 누른다.
    await as(A);
    await c.query(`delete from public.comment_likes where comment_id = $1`, [cid]);
    await c.query(`insert into public.user_blocks (blocker_id, blocked_id) values ($1, $2)`, [A, B]);
    expect(await expectError(`insert into public.comment_likes (comment_id) values ($1)`, [cid])).toMatch(/row-level security/);
  });
});
