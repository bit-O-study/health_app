import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { BANNED_MESSAGE, checkTexts, findBanned, normalizeForFilter, type BannedWord } from "@/features/community/banned-words";
import { answerOrder, threadComments } from "@/features/community/community";
import { boardHref, isRoutineList, mainTabOf, MAIN_TABS } from "@/features/community/feed";

/**
 * 커뮤니티 4-3(2026-09-30) — 금칙어 · 영상·루틴 저장 · 댓글 공감.
 * DB(직접 쓰기 차단·앱과 같은 판정·저장/공감 권한)는 tests/be/community-4-3.test.ts.
 */

const WORDS: BannedWord[] = [
  { word: "시발", category: "abuse" },
  { word: "ㅅㅂ", category: "abuse" },
  { word: "오픈채팅", category: "contact" },
  { word: "openkakao", category: "contact" },
  { word: "카지노", category: "gambling" },
  { word: "야동", category: "sexual" },
  { word: "시발점", category: "allow" },
];

describe("금칙어", () => {
  it("띄어쓰기·기호·대소문자를 무시한다", () => {
    expect(normalizeForFilter("시 .발!")).toBe("시발");
    expect(findBanned("ㅅ.ㅂ", WORDS)).toBe("abuse");
    expect(findBanned("OPEN.KAKAO.COM/abc", WORDS)).toBe("contact");
    expect(findBanned("오픈 채팅방", WORDS)).toBe("contact");
  });
  it("운동 글에 흔한 예외 단어는 통과(시발점), 평범한 글도 통과", () => {
    expect(findBanned("오늘이 벌크업의 시발점", WORDS)).toBeNull();
    expect(findBanned("벤치 100kg 3세트 성공!", WORDS)).toBeNull();
    expect(findBanned("", WORDS)).toBeNull();
  });
  it("🔴 예외 단어가 있어도 다른 금칙어는 잡는다", () => {
    expect(findBanned("시발점인데 시발", WORDS)).toBe("abuse");
  });
  it("단어 목록에 없는 연락처 모양 — 휴대폰 번호·텔레그램 링크", () => {
    expect(findBanned("연락 010-1234-5678", WORDS)).toBe("contact");
    expect(findBanned("01012345678로 문자", WORDS)).toBe("contact");
    expect(findBanned("t.me/abc 로 와요", WORDS)).toBe("contact");
    expect(findBanned("스쿼트 100 kg 5 세트", WORDS)).toBeNull();
  });
  it("여러 칸 중 하나라도 걸리면 이유 안내(막고 안내)", () => {
    expect(checkTexts(["괜찮은 제목", null, "카지노 가자"], WORDS)).toEqual({ ok: false, error: BANNED_MESSAGE.gambling });
    expect(checkTexts(["괜찮은 제목", undefined], WORDS)).toEqual({ ok: true });
  });
});

describe("질문 답변 순서 — 공감 많은 순 → 최신", () => {
  it("공감이 같으면 최신 먼저, 답글은 부모 아래 그대로", () => {
    const c = (id: string, likeCount: number, createdAt: string, parentId: string | null = null) => ({ id, likeCount, createdAt, parentId });
    const list = [c("old", 0, "2026-09-30T01:00:00Z"), c("mid", 3, "2026-09-30T02:00:00Z"), c("new", 0, "2026-09-30T03:00:00Z"), c("r", 0, "2026-09-30T04:00:00Z", "old")];
    expect(threadComments(list, answerOrder).map((o) => o.item.id)).toEqual(["mid", "new", "old", "r"]);
    // 정렬 없이 부르면(일반 글) 받은 순서 그대로.
    expect(threadComments(list).map((o) => o.item.id)).toEqual(["old", "r", "mid", "new"]);
  });
});

describe("저장한 루틴 보기", () => {
  it("내 글 탭 안 — 탭 줄은 그대로 다섯", () => {
    expect(mainTabOf("saved_routines")).toBe("mine");
    expect(boardHref("saved_routines")).toBe("/community/saved?kind=routine");
    expect(isRoutineList("saved_routines")).toBe(true);
    expect(isRoutineList("saved")).toBe(false);
    expect(MAIN_TABS).toHaveLength(5);
  });
});

const read = (p: string) => readFileSync(p, "utf8");

describe("가드", () => {
  it("🔴 쓰기 액션 여섯 곳(글·수정·댓글·영상·영상 댓글·루틴 소개)이 모두 금칙어를 먼저 검사한다", () => {
    const count = (s: string) => (s.match(/await checkCommunityText\(/g) ?? []).length;
    expect(count(read("src/features/community/community-actions.ts"))).toBe(3);
    expect(count(read("src/features/teaching/teaching-actions.ts"))).toBe(2);
    expect(count(read("src/features/routine-share/actions.ts"))).toBe(1);
  });
  it("🔴 앱 정규화와 DB 정규화가 같은 글자만 남긴다(둘이 다르면 판정이 갈린다)", () => {
    const ts = read("src/features/community/banned-words.ts");
    const sql = read("supabase/migrations/202609300007_community_4_3.sql");
    expect(ts).toContain("/[^가-힣ㄱ-ㅎa-z0-9]/g");
    expect(sql).toContain("'[^가-힣ㄱ-ㅎa-z0-9]'");
  });
  it("🔴 DB — 다섯 표에 금칙어 트리거, 루틴 소개 보기에 차단 반영", () => {
    const schema = read("supabase/schema.sql");
    for (const t of ["community_posts", "community_comments", "teaching_posts", "teaching_comments", "routine_shares"]) {
      expect(schema, t).toContain(`create trigger ${t}_text_guard`);
    }
    expect(schema).toMatch(/create policy "read routine shares"[\s\S]*?not public\.blocked_between\(user_id\)/);
  });
  it("댓글 공감은 알림을 만들지 않는다", () => {
    const actions = read("src/features/community/community-actions.ts");
    const body = actions.slice(actions.indexOf("export async function toggleCommentLikeAction"));
    expect(body).not.toMatch(/pushCommentNotification|notifyUser/);
  });
});
