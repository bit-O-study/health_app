import { randomUUID } from "node:crypto";

import type pg from "pg";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { hasDbCreds, makeClient } from "./db";

/**
 * 커뮤니티 2단계(2026-09-30, supabase/migrations/202609300003_community_phase2.sql) — 라이브 DB.
 * 🔴 테스트마다 트랜잭션 하나 — 끝나면 전부 롤백이라 라이브에 아무것도 남지 않는다.
 */

const d = hasDbCreds ? describe : describe.skip;

d("커뮤니티 2단계 — 검색·도배 막기", () => {
  let c: pg.Client;
  const A = randomUUID();

  async function as(uid: string, role: "authenticated" | "service_role" = "authenticated") {
    await c.query("reset role");
    await c.query(
      `select set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claim.role', $2, true),
              set_config('request.jwt.claims', $3, true)`,
      [uid, role, JSON.stringify({ sub: uid, role })],
    );
    await c.query(`set local role ${role}`);
  }

  beforeEach(async () => {
    c = makeClient();
    await c.connect();
    await c.query("begin");
    await c.query(`insert into auth.users (id, email, aud, role) values ($1, $2, 'authenticated', 'authenticated')`, [
      A,
      `p2-${A}@example.com`,
    ]);
    await c.query(
      `insert into public.profiles (user_id, gender, experience, nickname) values ($1, 'male', 'beginner', '검색러')
       on conflict (user_id) do update set nickname = excluded.nickname`,
      [A],
    );
  });

  afterEach(async () => {
    await c.query("rollback").catch(() => {});
    await c.end();
  });

  it("🔴 검색은 운동 이름으로 찾고, 기록 JSON 의 키 이름(sets 등)으로는 걸리지 않는다", async () => {
    await as(A, "service_role");
    const { rows } = await c.query(
      `insert into public.community_posts (user_id, author_name, workout_snapshot, visibility, caption)
       values ($1, '검색러', $2, 'public', '') returning id`,
      [A, JSON.stringify({ date: "2026-09-30", durationSec: 1800, exercises: [{ name: "불가리안스플릿스쿼트", sets: 3 }] })],
    );
    const id = rows[0].id;
    await as(A);
    const find = async (q: string) =>
      (await c.query(`select id from public.community_feed_page('mine', $1)`, [q])).rows.map((r) => r.id);
    expect(await find("불가리안")).toContain(id);
    expect(await find("sets")).not.toContain(id);
    expect(await find("durationSec")).not.toContain(id);
  });

  it("🔴 10분에 글 5개까지 — 6번째는 막힌다(사용자 권한), 서비스 롤 저장은 트리거가 건너뛴다", async () => {
    await as(A);
    for (let i = 0; i < 5; i++) {
      await c.query(
        `insert into public.community_posts (user_id, photo_url, visibility) values ($1, 'https://x/p.jpg', 'public')`,
        [A],
      );
    }
    await c.query("savepoint s");
    const err = await c
      .query(`insert into public.community_posts (user_id, photo_url, visibility) values ($1, 'https://x/p.jpg', 'public')`, [A])
      .then(() => null, (e: Error) => e.message);
    await c.query("rollback to savepoint s");
    expect(err).toContain("너무 자주");
    // 서비스 롤(운동 기록 카드 글)은 DB 가 아니라 서버 코드(POST_RATE_LIMIT)가 막는다.
    await as(A, "service_role");
    const ok = await c.query(
      `insert into public.community_posts (user_id, author_name, photo_url, visibility) values ($1, '검색러', 'https://x/p.jpg', 'public')`,
      [A],
    );
    expect(ok.rowCount).toBe(1);
  });
});
