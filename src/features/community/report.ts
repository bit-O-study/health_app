/**
 * 게시판/댓글 신고 순수 로직 — 대상 종류·사유(의존성 없음, 테스트 공용).
 */

export type ReportTargetKind =
  | "community_post"
  | "community_comment"
  | "teaching_post"
  | "teaching_comment";

export const REPORT_REASONS = [
  "스팸/광고",
  "욕설/비방",
  "음란물/선정성",
  "사칭/개인정보",
  "기타",
] as const;

const KIND_LABEL: Record<ReportTargetKind, string> = {
  community_post: "오운완 게시글",
  community_comment: "댓글",
  teaching_post: "운동 영상",
  teaching_comment: "운동 영상 댓글",
};

export function reportKindLabel(kind: ReportTargetKind): string {
  return KIND_LABEL[kind] ?? "게시물";
}

/** 댓글 계열 신고인가(글 삭제 vs 댓글 삭제 분기용). */
export function isCommentKind(kind: ReportTargetKind): boolean {
  return kind === "community_comment" || kind === "teaching_comment";
}

/** 운동(티칭) 계열 신고인가(community vs teaching 삭제 액션 분기용). */
export function isTeachingKind(kind: ReportTargetKind): boolean {
  return kind === "teaching_post" || kind === "teaching_comment";
}

/** 신고 사유 유효성(빈 값·500자 초과 방지). */
export function isValidReason(reason: string): boolean {
  const t = (reason ?? "").trim();
  return t.length >= 1 && t.length <= 500;
}
