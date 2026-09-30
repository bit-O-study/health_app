import { readFileSync, readdirSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { pageComments } from "@/features/community/comment-page";
import { POST_RATE_LIMIT, POST_RATE_WINDOW_MS, communityPhotoPath } from "@/features/community/community";
import { PHOTO_MAX_EDGE, photoUploadPlan } from "@/features/community/photo-resize";

/**
 * 커뮤니티 2단계(2026-09-30) — 순수 로직 + 코드 가드.
 * DB 쪽(검색·속도 제한)은 tests/be/community-phase2.test.ts(라이브 DB, 롤백)가 확인한다.
 */

describe("pageComments — 댓글 한 페이지", () => {
  it("최신부터 읽은 것을 오래된 → 최신 순으로 뒤집는다", () => {
    expect(pageComments([3, 2, 1], 50)).toEqual({ comments: [1, 2, 3], hasMore: false });
  });
  it("limit+1 개가 오면 '더 있음' 이고 넘친 1개(가장 오래된 것)는 버린다", () => {
    expect(pageComments([5, 4, 3], 2)).toEqual({ comments: [4, 5], hasMore: true });
  });
  it("정확히 limit 개면 더 없음", () => {
    expect(pageComments([2, 1], 2).hasMore).toBe(false);
  });
  it("빈 목록", () => {
    expect(pageComments([], 50)).toEqual({ comments: [], hasMore: false });
  });
});

describe("photoUploadPlan — 사진 줄이기", () => {
  it("긴 변이 1600px 넘으면 비율 유지하며 줄인다(세로 사진도)", () => {
    expect(photoUploadPlan(4032, 3024, 3_000_000, "image/jpeg")).toEqual({ resize: true, width: PHOTO_MAX_EDGE, height: 1200 });
    expect(photoUploadPlan(3024, 4032, 3_000_000, "image/jpeg")).toEqual({ resize: true, width: 1200, height: PHOTO_MAX_EDGE });
  });
  it("작고 가벼운 JPEG·PNG 는 그대로", () => {
    expect(photoUploadPlan(1200, 900, 400_000, "image/jpeg").resize).toBe(false);
    expect(photoUploadPlan(800, 800, 200_000, "image/png").resize).toBe(false);
  });
  it("크기는 작아도 파일이 무겁거나 웹에서 못 쓰는 형식이면 JPEG 로 다시 그린다", () => {
    expect(photoUploadPlan(1200, 900, 5_000_000, "image/jpeg")).toEqual({ resize: true, width: 1200, height: 900 });
    expect(photoUploadPlan(1200, 900, 300_000, "image/heic").resize).toBe(true);
  });
});

describe("communityPhotoPath — 글 삭제 때 지울 사진 파일", () => {
  const U = "11111111-2222-3333-4444-555555555555";
  const base = "https://abc.supabase.co/storage/v1/object/public/community-photos/";
  it("공개 주소 → 저장소 경로", () => {
    expect(communityPhotoPath(`${base}${U}/a.jpg`, U)).toBe(`${U}/a.jpg`);
    expect(communityPhotoPath(`${base}${U}/a.jpg?t=1`, U)).toBe(`${U}/a.jpg`);
  });
  it("🔴 작성자 폴더 밖·다른 버킷·빈 값은 지우지 않는다", () => {
    expect(communityPhotoPath(`${base}other-user/a.jpg`, U)).toBeNull();
    expect(communityPhotoPath(`${base}${U}/../other/a.jpg`, U)).toBeNull();
    expect(communityPhotoPath(`https://abc.supabase.co/storage/v1/object/public/avatars/${U}/a.jpg`, U)).toBeNull();
    expect(communityPhotoPath(null, U)).toBeNull();
    expect(communityPhotoPath(`${base}${U}/a.jpg`, null)).toBeNull();
  });
});

const actions = readFileSync("src/features/community/community-actions.ts", "utf8");
const data = readFileSync("src/features/community/data-access.ts", "utf8");
const schema = readFileSync("supabase/schema.sql", "utf8");
const migration = readFileSync("supabase/migrations/202609300003_community_phase2.sql", "utf8");
const componentsDir = "src/features/community/components";

describe("가드 — 브라우저 alert/confirm 대신 앱 안 안내", () => {
  it("🔴 커뮤니티 화면 어디에도 alert(·confirm( 이 없다(앱 WebView 에선 투박하고 막히기도 한다)", () => {
    for (const f of readdirSync(componentsDir)) {
      const src = readFileSync(`${componentsDir}/${f}`, "utf8");
      expect(src, f).not.toMatch(/(^|[^.\w])(alert|confirm)\(/m);
    }
  });
});

describe("가드 — 서버 동작", () => {
  it("🔴 글을 지우면 사진 파일도 지운다(작성자 폴더만)", () => {
    expect(actions).toContain('.select("user_id, photo_url")');
    expect(actions).toContain('storage.from("community-photos")');
    expect(actions).toContain("communityPhotoPath(");
  });
  it("🔴 운동 기록 카드 글(서비스 롤 저장)도 DB 트리거와 같은 속도 한도를 먼저 확인한다", () => {
    expect(POST_RATE_LIMIT).toBe(5);
    expect(POST_RATE_WINDOW_MS).toBe(10 * 60 * 1000);
    expect(actions).toContain(">= POST_RATE_LIMIT");
    expect(schema).toContain("community_rate_guard('5', '10 minutes')");
  });
  it("상세 화면은 댓글을 한 페이지씩, 개수는 집계 함수로", () => {
    expect(data).toContain("pageComments(");
    expect(data).toContain('rpc("community_post_counts"');
  });
});

describe("가드 — DB(스키마·마이그레이션)", () => {
  it("🔴 검색은 운동 이름만 — 기록 JSON 전체(키 이름 name·sets 등)로 찾지 않는다", () => {
    expect(schema).toContain("string_agg(e->>'name', ' ')");
    expect(migration).toContain("string_agg(e->>'name', ' ')");
  });
  it("🔴 글·댓글·영상·영상 댓글 네 곳 모두 쓰기 속도 제한", () => {
    for (const t of ["community_posts_rate", "community_comments_rate", "teaching_posts_rate", "teaching_comments_rate"]) {
      expect(schema, t).toContain(`create trigger ${t} before insert`);
    }
  });
});
