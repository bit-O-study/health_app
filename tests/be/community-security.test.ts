import { randomUUID } from "node:crypto";

import type pg from "pg";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { hasDbCreds, makeClient } from "./db";

/**
 * 커뮤니티 보안 1단계(2026-09-30, supabase/migrations/202609300001_community_security.sql).
 *
 * "앱을 거치지 않고 DB 에 직접 써도 막히는가" 를 **라이브 DB** 에서 확인한다.
 * 사용자 권한(authenticated, REST 와 같은 역할)으로 공격을 흉내 낸다.
 * 🔴 테스트마다 트랜잭션 하나 — 끝나면 **전부 롤백**이라 라이브에 아무것도 남지 않는다.
 */

const d = hasDbCreds ? describe : describe.skip;

d("커뮤니티 보안 — DB 에 직접 써도 막힌다", () => {
  let c: pg.Client;
  const A = randomUUID(); // 일반 회원(그룹 멤버)
  const B = randomUUID(); // 그룹 밖 회원
  const S = randomUUID(); // 정지된 회원
  const G = randomUUID(); // 그룹

  /** 이 사용자로(REST 와 같은 authenticated 역할) 바꾼다. */
  async function as(uid: string, role: "authenticated" | "service_role" = "authenticated") {
    await c.query("reset role");
    await c.query(
      `select set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claim.role', $2, true),
              set_config('request.jwt.claims', $3, true)`,
      [uid, role, JSON.stringify({ sub: uid, role })],
    );
    await c.query(`set local role ${role}`);
  }
  /** 실패가 예상되는 문장 — 저장점으로 감싸 트랜잭션을 살린다. 에러 메시지를 돌려준다. */
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

  beforeEach(async () => {
    c = makeClient();
    await c.connect();
    await c.query("begin");
    // 픽스처(관리 권한) — 롤백되므로 라이브에 남지 않는다.
    for (const [id, nick] of [[A, "에이"], [B, "비"], [S, "정지됨"]] as const) {
      await c.query(`insert into auth.users (id, email, aud, role) values ($1, $2, 'authenticated', 'authenticated')`, [
        id,
        `sec-${id}@example.com`,
      ]);
      await c.query(
        `insert into public.profiles (user_id, gender, experience, nickname) values ($1, 'male', 'beginner', $2)
         on conflict (user_id) do update set nickname = excluded.nickname`,
        [id, nick],
      );
    }
    await c.query(`update public.profiles set suspended_until = now() + interval '3 days' where user_id = $1`, [S]);
    await c.query(`insert into public.groups (id, name, owner_id) values ($1, '보안 테스트', $2)`, [G, A]);
    await c.query(`insert into public.group_members (group_id, user_id) values ($1, $2) on conflict do nothing`, [G, A]);
  });

  afterEach(async () => {
    await c.query("rollback").catch(() => {});
    await c.end();
  });

  it("🔴 작성자 이름을 '관리자' 로 보내도 프로필 닉네임으로 저장된다(글·댓글)", async () => {
    await as(A);
    const post = await c.query(
      `insert into public.community_posts (user_id, author_name, photo_url, visibility) values ($1, '관리자', 'https://x/p.jpg', 'public') returning id, author_name`,
      [A],
    );
    expect(post.rows[0].author_name).toBe("에이");
    const cm = await c.query(
      `insert into public.community_comments (post_id, user_id, author_name, body) values ($1, $2, '관리자', '안녕') returning author_name`,
      [post.rows[0].id, A],
    );
    expect(cm.rows[0].author_name).toBe("에이");
  });

  it("🔴 하지도 않은 '운동 완료' 카드를 직접 붙일 수 없다 — 서버(서비스 롤)만", async () => {
    await as(A);
    const msg = await expectError(
      `insert into public.community_posts (user_id, workout_snapshot, visibility) values ($1, $2, 'public')`,
      [A, JSON.stringify({ date: "2026-09-30", durationSec: 3600, exercises: [{ name: "벤치프레스 200kg", sets: 10 }] })],
    );
    expect(msg).toContain("서버에서만");
    // 서버(서비스 롤)는 된다.
    await as(A, "service_role");
    const ok = await c.query(
      `insert into public.community_posts (user_id, author_name, workout_snapshot, visibility) values ($1, '에이', $2, 'public') returning id`,
      [A, JSON.stringify({ date: "2026-09-30", durationSec: null, exercises: [{ name: "스쿼트", sets: 3 }] })],
    );
    expect(ok.rowCount).toBe(1);
  });

  it("🔴 글 수정으로 그룹·공개 범위·이름을 바꿀 수 없다 — 한마디만", async () => {
    await as(A);
    const { rows } = await c.query(
      `insert into public.community_posts (user_id, photo_url, visibility, caption) values ($1, 'https://x/p.jpg', 'public', '처음') returning id`,
      [A],
    );
    const id = rows[0].id;
    expect(await expectError(`update public.community_posts set group_id = $2, visibility = 'group' where id = $1`, [id, G])).toContain(
      "한마디만",
    );
    expect(await expectError(`update public.community_posts set author_name = '관리자' where id = $1`, [id])).toContain("한마디만");
    const ok = await c.query(`update public.community_posts set caption = '고친 한마디' where id = $1 returning caption`, [id]);
    expect(ok.rows[0].caption).toBe("고친 한마디");
  });

  it("🔴 그룹 전용 운동 영상의 좋아요·댓글은 그룹 밖에서 읽거나 쓸 수 없다", async () => {
    await as(A);
    const { rows } = await c.query(
      `insert into public.teaching_posts (user_id, group_id, visibility, exercise_tag, video_url) values ($1, $2, 'group', '스쿼트', 'https://x/v.mp4') returning id`,
      [A, G],
    );
    const tid = rows[0].id;
    await c.query(`insert into public.teaching_comments (post_id, user_id, body) values ($1, $2, '그룹만 보는 댓글')`, [tid, A]);
    await c.query(`insert into public.teaching_likes (post_id, user_id) values ($1, $2)`, [tid, A]);

    await as(B);
    expect((await c.query(`select count(*)::int n from public.teaching_comments where post_id = $1`, [tid])).rows[0].n).toBe(0);
    expect((await c.query(`select count(*)::int n from public.teaching_likes where post_id = $1`, [tid])).rows[0].n).toBe(0);
    expect(await expectError(`insert into public.teaching_comments (post_id, user_id, body) values ($1, $2, '몰래')`, [tid, B])).toMatch(
      /row-level security/,
    );
    expect(await expectError(`insert into public.teaching_likes (post_id, user_id) values ($1, $2)`, [tid, B])).toMatch(
      /row-level security/,
    );
  });

  it("🔴 정지된 회원은 직접 써도 글·댓글·좋아요를 못 남긴다", async () => {
    await as(A);
    const { rows } = await c.query(
      `insert into public.community_posts (user_id, photo_url, visibility) values ($1, 'https://x/p.jpg', 'public') returning id`,
      [A],
    );
    await as(S);
    expect(
      await expectError(`insert into public.community_posts (user_id, photo_url, visibility) values ($1, 'https://x/s.jpg', 'public')`, [S]),
    ).toMatch(/row-level security/);
    expect(await expectError(`insert into public.community_comments (post_id, user_id, body) values ($1, $2, 'x')`, [rows[0].id, S])).toMatch(
      /row-level security/,
    );
    expect(await expectError(`insert into public.community_likes (post_id, user_id) values ($1, $2)`, [rows[0].id, S])).toMatch(
      /row-level security/,
    );
  });

  it("🔴 루틴 신고가 저장되고, 같은 대상 두 번 신고는 DB 가 막는다", async () => {
    await as(A);
    const target = randomUUID();
    await c.query(
      `insert into public.post_reports (target_kind, target_id, reporter_id, reason) values ('routine_share', $1, $2, '부적절')`,
      [target, A],
    );
    const msg = await expectError(
      `insert into public.post_reports (target_kind, target_id, reporter_id, reason) values ('routine_share', $1, $2, '또')`,
      [target, A],
    );
    expect(msg).toMatch(/duplicate key|post_reports_reporter_target_uniq/);
  });
});
