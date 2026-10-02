import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { MAX_CAPTION, MAX_QUESTION_BODY, captionLimit, validateQuestionInput } from "@/features/community/community";
import { notificationHref, notificationText, unreadBadge } from "@/features/community/community-notifications";
import { MAIN_TABS, boardHref, mainTabOf } from "@/features/community/feed";
import { feedView } from "@/features/community/feed-page";
import { DEFAULT_PREFERENCES, kindForPushType, parsePreferences } from "@/features/notifications/preferences";

/**
 * 커뮤니티 3단계(2026-09-30) — 순수 로직 + 코드 가드.
 * DB 규칙(차단·숨김·알림·저장·질문·좋아요 묶음)은 tests/be/community-phase3.test.ts(라이브 DB, 롤백).
 */

describe("질문 글 입력", () => {
  it("제목은 필수, 앞뒤 공백은 자른다", () => {
    expect(validateQuestionInput({ title: "  ", body: "x" }).ok).toBe(false);
    expect(validateQuestionInput({ title: " 무릎이 아파요 ", body: "" })).toEqual({ ok: true, title: "무릎이 아파요", body: null });
  });
  it("제목 60자 · 본문 1000자까지(DB 제약과 같은 값)", () => {
    expect(validateQuestionInput({ title: "가".repeat(61), body: "" }).ok).toBe(false);
    expect(validateQuestionInput({ title: "가", body: "나".repeat(MAX_QUESTION_BODY + 1) }).ok).toBe(false);
    expect(validateQuestionInput({ title: "가".repeat(60), body: "나".repeat(MAX_QUESTION_BODY) }).ok).toBe(true);
  });
  it("수정 한도는 글 종류별", () => {
    expect(captionLimit("photo")).toBe(MAX_CAPTION);
    expect(captionLimit("question")).toBe(1000);
  });
});

describe("알림 문구·이동", () => {
  it("댓글 알림은 글 상세, 영상 댓글은 영상 한 편 화면으로", () => {
    expect(notificationHref({ postId: "p1", teachingPostId: null })).toBe("/community/p1");
    expect(notificationHref({ postId: null, teachingPostId: "t1" })).toBe("/community/reel/t1");
    expect(notificationHref({ postId: null, teachingPostId: null })).toBe("/community");
  });
  it("문구 — 이름이 없으면 '누군가', 좋아요는 개수", () => {
    expect(notificationText({ kind: "comment", actorName: "비", preview: "멋져요", likeCount: null })).toEqual({
      title: "비님이 내 글에 댓글을 남겼어요",
      body: "멋져요",
    });
    expect(notificationText({ kind: "teaching_comment", actorName: " ", preview: null, likeCount: null }).title).toBe(
      "누군가님이 내 운동 영상에 댓글을 남겼어요",
    );
    expect(notificationText({ kind: "likes", actorName: null, preview: null, likeCount: 7 }).title).toBe("오늘 좋아요 7개를 받았어요");
  });
  it("뱃지 — 0 이면 없음, 99 넘으면 99+", () => {
    expect(unreadBadge(0)).toBeNull();
    expect(unreadBadge(3)).toBe("3");
    expect(unreadBadge(120)).toBe("99+");
  });
});

describe("게시판 탭", () => {
  it("탭 줄은 큰 탭 다섯 — 인기·답변 기다리는·저장한 글은 탭 안 선택지", () => {
    expect(MAIN_TABS.map((t) => t.label)).toEqual(["피드", "질문", "운동 영상", "루틴", "내 글"]);
    expect(mainTabOf("popular")).toBe("workout");
    expect(mainTabOf("question_open")).toBe("question");
    expect(mainTabOf("saved")).toBe("mine");
  });
  it("보기 → 주소(뒤로 가기에도 같은 보기)", () => {
    expect(boardHref("workout")).toBe("/community");
    expect(boardHref("popular", "스쿼트")).toBe("/community?view=popular&q=%EC%8A%A4%EC%BF%BC%ED%8A%B8");
    expect(boardHref("question_open")).toBe("/community/questions?open=1");
    expect(boardHref("saved")).toBe("/community/saved");
    expect(boardHref("teaching")).toBe("/community/teaching");
  });
  it("서버 조회 보기에 질문·답변 기다리는·저장한 글이 있다(모르는 값은 피드)", () => {
    expect(feedView("question")).toBe("question");
    expect(feedView("question_open")).toBe("question_open");
    expect(feedView("saved")).toBe("saved");
    expect(feedView("drop table")).toBe("workout");
  });
});

describe("알림 설정 — 커뮤니티 반응", () => {
  it("🔴 댓글·좋아요 묶음 푸시는 '커뮤니티 반응' 으로 끌 수 있다", () => {
    expect(kindForPushType("community-comment")).toBe("community-activity");
    expect(kindForPushType("community-likes")).toBe("community-activity");
  });
  it("기본은 켜짐, DB 칸(community_activity)을 읽는다", () => {
    expect(DEFAULT_PREFERENCES.kinds["community-activity"]).toBe(true);
    expect(parsePreferences({ community_activity: false }).kinds["community-activity"]).toBe(false);
  });
});

const read = (p: string) => readFileSync(p, "utf8");
const actions = read("src/features/community/community-actions.ts");
const teaching = read("src/features/teaching/teaching-actions.ts");
const notify = read("src/features/community/community-notify.server.ts");
const cron = read("src/app/api/cron/daily-reminders/route.ts");
const report = read("src/features/community/components/report-button.tsx");
const reportActions = read("src/features/community/report-actions.ts");
const schema = read("supabase/schema.sql");
const migration = read("supabase/migrations/202609300004_community_phase3.sql");

describe("가드 — 알림 경로", () => {
  it("🔴 글 댓글·영상 댓글 둘 다 저장 뒤 푸시를 건다(한 곳만 고치지 않게)", () => {
    expect(actions).toContain('pushCommentNotification("comment"');
    expect(teaching).toContain('pushCommentNotification("teaching_comment"');
  });
  it("🔴 푸시는 설정(커뮤니티 반응·야간 금지)을 거친다", () => {
    expect(notify).toMatch(/decideSend\(prefs, "community-activity"/);
    expect(notify).toMatch(/filterByPreference\([\s\S]{0,120}"community-activity"/);
  });
  it("좋아요 묶음은 하루 리마인더 크론이 부르고, 오늘 리마인더를 받는 사람에겐 푸시하지 않는다", () => {
    expect(cron).toContain("runLikeDigest(");
    // 일요일 이번 주 정리(라이트, 2026-10-02)를 받는 사람도 오늘 저녁 푸시를 받은 사람이다.
    expect(cron).toContain("[...targets, ...balance.targets, ...summary.targets].map((t) => t.userId)");
  });
});

describe("가드 — 차단", () => {
  it("신고 창에서 차단 — 대상 작성자는 서버가 원본에서 찾는다", () => {
    expect(report).toContain("blockAuthorAction");
    expect(reportActions).toMatch(/blockAuthorAction[\s\S]*from\(source\.table\)\.select\("user_id"\)/);
  });
});

describe("가드 — DB(스키마·마이그레이션)", () => {
  it("🔴 보이는 글 규칙이 숨김·차단을 본다(피드·상세·직접 링크·댓글이 전부 이 규칙)", () => {
    for (const s of [schema, migration]) {
      expect(s).toContain("p.hidden_at is null and not public.blocked_between(p.user_id)");
      expect(s).toContain("create trigger post_reports_auto_hide");
      expect(s).toContain("when n >= 3");
    }
  });
  it("🔴 숨김은 작성자가 스스로 풀 수 없다(신고 트리거 안에서만)", () => {
    expect(migration).toContain("new.hidden_at is distinct from old.hidden_at and pg_trigger_depth() <= 1");
  });
  it("알림은 트리거가 만들고, 좋아요 묶음 함수는 서비스 롤만", () => {
    expect(migration).toContain("create trigger community_comments_notify after insert");
    expect(migration).toContain("create trigger teaching_comments_notify after insert");
    expect(migration).toContain("revoke execute on function public.community_like_digest(timestamptz) from public, anon, authenticated");
  });
  it("알림 설정 칸 community_activity 가 스키마에 있다", () => {
    expect(schema).toContain("add column if not exists community_activity boolean not null default true");
  });
});
