import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  MAX_COMMENT_LEN,
  checkComment,
  commentDateLabel,
} from "@/features/groups/trainer-comment";
import {
  NOTIFICATION_KINDS,
  PREFERENCE_ROW_KEYS,
  kindForPushType,
} from "@/features/notifications/preferences";

describe("트레이너 코멘트 검증", () => {
  it("앞뒤 공백을 털고 저장한다", () => {
    expect(checkComment("  스쿼트 무릎  ")).toEqual({ ok: true, body: "스쿼트 무릎" });
  });

  it("🔴 공백만 있는 코멘트를 막는다", () => {
    // DB 제약은 `char_length >= 1` 이라 스페이스 하나도 통과한다 —
    // 그러면 회원 화면에 빈 말풍선이 뜬다.
    expect(checkComment("   ").ok).toBe(false);
    expect(checkComment("").ok).toBe(false);
    expect(checkComment("\n\n").ok).toBe(false);
  });

  it("문자열이 아니면 막는다", () => {
    expect(checkComment(null).ok).toBe(false);
    expect(checkComment(42).ok).toBe(false);
  });

  it(`${MAX_COMMENT_LEN}자까지 되고 넘으면 막는다`, () => {
    expect(checkComment("가".repeat(MAX_COMMENT_LEN)).ok).toBe(true);
    expect(checkComment("가".repeat(MAX_COMMENT_LEN + 1)).ok).toBe(false);
  });

  it("🔴 화면 최대 길이와 DB 제약이 같은 값이다", () => {
    // 화면이 더 길게 받으면 저장 순간 원인 모를 오류가 나고,
    // 더 짧게 받으면 DB 제약이 아무 일도 안 한다.
    const schema = readFileSync("supabase/schema.sql", "utf8");
    const block = schema.slice(schema.indexOf("create table if not exists public.trainer_comments"));
    expect(block).toContain(`char_length(body) between 1 and ${MAX_COMMENT_LEN}`);
  });
});

describe("코멘트 날짜 라벨", () => {
  it("서울 기준 날짜로 찍는다", () => {
    // 2026-09-09T15:30Z = 서울 10일 00:30 → '9월 10일'
    expect(commentDateLabel("2026-09-09T15:30:00.000Z")).toBe("9월 10일");
  });
  it("깨진 값이면 빈 문자열 — 화면이 죽지 않게", () => {
    expect(commentDateLabel("nope")).toBe("");
  });
});

describe("코멘트 알림", () => {
  it("종류로 등록돼 있고 배정과 따로 끈다", () => {
    // 하나는 루틴 변경, 하나는 말이다 — 한 스위치로 묶으면 한쪽을 못 끈다.
    expect(NOTIFICATION_KINDS).toContain("trainer-comment");
    expect(kindForPushType("trainer-comment")).toBe("trainer-comment");
    expect(kindForPushType("trainer-comment")).not.toBe("routine-assigned");
  });

  it("조회 컬럼에도 따라 들어온다", () => {
    expect(PREFERENCE_ROW_KEYS).toContain("trainer_comment");
  });
});

/**
 * 🔴 RLS 로 막는 규칙을 **서버 액션이 다시 구현하지 않았는지** 본다.
 *
 * 같은 규칙을 두 곳에 두면 한쪽만 고쳐지는 날이 온다. 여기서는 권한 판단이 전부
 * 자기 행의 컬럼으로 표현되므로 RLS 한 곳에서 끝난다 — 액션은 길이만 본다.
 */
describe("코멘트 액션은 권한을 다시 판단하지 않는다", () => {
  const src = readFileSync("src/features/groups/trainer-actions.ts", "utf8");
  const fn = src.slice(
    src.indexOf("export async function addTrainerCommentAction"),
    src.indexOf("export async function deleteTrainerCommentAction"),
  );

  it("owner_id 를 액션에서 다시 확인하지 않는다", () => {
    expect(fn).not.toContain("owner_id");
  });

  it("길이 검증은 순수 함수로 한다", () => {
    expect(fn).toContain("checkComment(");
  });

  it("RLS 오류를 그대로 노출하지 않는다 — 그룹 구조가 새어 나간다", () => {
    expect(fn).not.toContain("error.message");
  });
});
