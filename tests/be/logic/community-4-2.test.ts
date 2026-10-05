import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { normalizeQuestionTag, threadComments } from "@/features/community/community";
import { notificationHref, notificationText } from "@/features/community/community-notifications";
import { parseDraft } from "@/features/community/compose-draft";

/**
 * 커뮤니티 4-2(2026-09-30) — 답글 · 답변 채택 · 질문 운동 태그 · 작성자 프로필.
 * DB 규칙은 tests/be/community-4-2.test.ts(라이브 DB, 롤백).
 */

describe("답글 — 화면 순서", () => {
  const c = (id: string, parentId: string | null = null) => ({ id, parentId });
  it("답글은 부모 바로 아래(오래된 순), 부모 없는 댓글 순서는 그대로", () => {
    const out = threadComments([c("a"), c("b"), c("a1", "a"), c("c"), c("a2", "a"), c("b1", "b")]);
    expect(out.map((o) => `${o.item.id}${o.reply ? "↳" : ""}`)).toEqual(["a", "a1↳", "a2↳", "b", "b1↳", "c"]);
  });
  it("부모가 이 페이지에 없으면(50개 밖) 제자리에 답글 표시로", () => {
    const out = threadComments([c("x1", "old"), c("d")]);
    expect(out).toEqual([
      { item: c("x1", "old"), reply: true },
      { item: c("d"), reply: false },
    ]);
  });
});

describe("질문 운동 태그", () => {
  it("'#'·공백 정리, 40자, 비면 없음", () => {
    expect(normalizeQuestionTag("  #스쿼트  ")).toBe("스쿼트");
    expect(normalizeQuestionTag("벤치   프레스")).toBe("벤치 프레스");
    expect(normalizeQuestionTag("   ")).toBeNull();
    expect(normalizeQuestionTag(undefined)).toBeNull();
    expect(normalizeQuestionTag("가".repeat(50))).toHaveLength(40);
  });
  it("임시 저장도 태그를 이어 쓴다", () => {
    const now = 1_790_000_000_000;
    const raw = JSON.stringify({ mode: "question", title: "t", tag: "스쿼트", caption: "", visibility: "public", groupId: null, savedAt: now });
    expect(parseDraft(raw, now)?.tag).toBe("스쿼트");
  });
});

describe("답글·채택 알림", () => {
  const id = "11111111-2222-4333-8444-555555555555";
  it("문구", () => {
    expect(notificationText({ kind: "reply", actorName: "씨", preview: "맞아요", likeCount: null }).title).toBe("씨님이 내 댓글에 답글을 남겼어요");
    expect(notificationText({ kind: "accepted", actorName: "에이", preview: "벤치 어깨 통증", likeCount: null })).toEqual({
      title: "에이님이 내 답변을 채택했어요",
      body: "벤치 어깨 통증",
    });
  });
  it("누르면 그 댓글(답글·채택된 내 답변) 위치로", () => {
    expect(notificationHref({ kind: "reply", postId: "p", teachingPostId: null, sourceId: id })).toBe(`/community/p#c-${id}`);
    expect(notificationHref({ kind: "accepted", postId: "p", teachingPostId: null, sourceId: id })).toBe(`/community/p#c-${id}`);
  });
});

const read = (p: string) => readFileSync(p, "utf8");

describe("가드", () => {
  const actions = read("src/features/community/community-actions.ts");
  const notify = read("src/features/community/community-notify.server.ts");
  const migration = read("supabase/migrations/202609300006_community_4_2.sql");
  const schema = read("supabase/schema.sql");
  it("🔴 채택은 내 질문에서만(서버도 작성자·질문 조건), 채택하면 답변자에게 푸시", () => {
    expect(actions).toMatch(/acceptAnswerAction[\s\S]*\.eq\("user_id", user\.id\)\s*\.eq\("post_type", "question"\)/);
    expect(actions).toContain('pushCommentNotification("accepted", commentId)');
  });
  it("댓글 푸시는 글쓴이 알림과 답글 알림을 둘 다 보낸다", () => {
    expect(notify).toContain('kind === "comment" ? ["comment", "reply"] : [kind]');
  });
  it("🔴 DB — 채택은 그 글의 남 댓글만 + 자동 해결됨, 답글은 같은 글·한 단계", () => {
    for (const s of [migration, schema]) {
      expect(s).toContain("c.id = new.accepted_comment_id and c.post_id = new.id and c.user_id <> new.user_id");
      expect(s).toContain("new.resolved_at := coalesce(new.resolved_at, now());");
      expect(s).toContain("new.parent_id := coalesce(p.parent_id, p.id);");
      expect(s).toContain("create trigger community_posts_accept_notify");
    }
  });
  it("🔴 작성자 프로필은 security invoker(기존 보기 권한 그대로) · 익명 실행 불가", () => {
    expect(migration).toMatch(/community_author_posts[\s\S]*?security invoker/);
    expect(migration).toContain("revoke execute on function public.community_author_posts(uuid, int) from public, anon");
  });
});
