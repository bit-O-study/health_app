import { describe, expect, it } from "vitest";

import {
  isCommentKind,
  isTeachingKind,
  isValidReason,
  reportKindLabel,
  REPORT_REASONS,
  type ReportTargetKind,
} from "@/features/community/report";

describe("report — 대상 종류 분기", () => {
  const kinds: ReportTargetKind[] = [
    "community_post",
    "community_comment",
    "teaching_post",
    "teaching_comment",
  ];

  it("모든 종류가 라벨을 가진다", () => {
    for (const k of kinds) expect(reportKindLabel(k)).toBeTruthy();
  });

  it("isCommentKind — 댓글 계열만 true", () => {
    expect(isCommentKind("community_comment")).toBe(true);
    expect(isCommentKind("teaching_comment")).toBe(true);
    expect(isCommentKind("community_post")).toBe(false);
    expect(isCommentKind("teaching_post")).toBe(false);
  });

  it("isTeachingKind — 운동(티칭) 계열만 true", () => {
    expect(isTeachingKind("teaching_post")).toBe(true);
    expect(isTeachingKind("teaching_comment")).toBe(true);
    expect(isTeachingKind("community_post")).toBe(false);
    expect(isTeachingKind("community_comment")).toBe(false);
  });
});

describe("isValidReason", () => {
  it("1~500자만 유효", () => {
    expect(isValidReason("스팸")).toBe(true);
    expect(isValidReason("  ")).toBe(false);
    expect(isValidReason("")).toBe(false);
    expect(isValidReason("a".repeat(500))).toBe(true);
    expect(isValidReason("a".repeat(501))).toBe(false);
  });

  it("기본 사유 목록은 전부 유효", () => {
    for (const r of REPORT_REASONS) expect(isValidReason(r)).toBe(true);
  });
});
