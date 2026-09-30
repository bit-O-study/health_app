import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

/**
 * 커뮤니티 보안 1단계(2026-09-30) — 앱 코드 가드.
 * DB 쪽은 tests/be/community-security.test.ts(라이브 DB, 롤백)가 공격을 흉내 내 확인한다.
 */
const report = readFileSync("src/features/community/report-actions.ts", "utf8");
const post = readFileSync("src/features/community/community-actions.ts", "utf8");
const migration = readFileSync("supabase/migrations/202609300001_community_security.sql", "utf8");
const schema = readFileSync("supabase/schema.sql", "utf8");

describe("신고 — 대상은 서버가 원본에서 찾는다", () => {
  it("🔴 앱이 보낸 대상 사용자·작성자·미리보기를 저장에 쓰지 않는다", () => {
    expect(report).not.toMatch(/input\.targetUserId|input\.targetAuthor|input\.targetPreview/);
    expect(report).toContain("const targetUserId = String(original.user_id)");
  });
  it("모든 신고 종류(글·댓글·영상·영상 댓글·루틴)의 원본 표를 안다", () => {
    for (const kind of ["community_post", "community_comment", "teaching_post", "teaching_comment", "routine_share"]) {
      expect(report, kind).toContain(`${kind}: {`);
    }
  });
  it("관리자만 읽을 수 있는 신고 목록을 미리 조회하던 무의미한 중복 확인을 뺐다(DB 유일 인덱스가 막음)", () => {
    expect(report).not.toMatch(/from\("post_reports"\)\s*\.select/);
    expect(report).toContain('error?.code === "23505"');
  });
});

describe("운동 기록 카드 — 서버(서비스 롤)만", () => {
  it("🔴 카드가 있는 글은 서비스 롤로 쓰고, RLS 가 하던 확인(정지·그룹 멤버)을 먼저 한다", () => {
    expect(post).toContain("const writer = snapshot ? createSupabaseAdminClient() : supabase;");
    expect(post).toContain('rpc("is_active_member")');
    expect(post).toMatch(/from\("group_members"\)[\s\S]*eq\("user_id", user\.id\)/);
  });
});

describe("마이그레이션 = schema.sql 끝부분", () => {
  it("라이브에 적용한 마이그레이션이 schema.sql 에도 그대로 있다", () => {
    const norm = (t: string) => t.replace(/\r\n/g, "\n").trim();
    expect(norm(schema)).toContain(norm(migration));
  });
  it("지킴이는 사용자 권한 요청에만 — 테스트 시드·관리 작업(DB 직접 접속)은 막지 않는다", () => {
    expect(migration).toContain("coalesce(auth.role(), '') in ('authenticated', 'anon')");
    expect(migration).not.toMatch(/as \$\n|^\$;/m);
  });
});
