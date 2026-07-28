import { describe, expect, it } from "vitest";

import {
  banBadgeLabel,
  reportActionState,
  suspendButtonLabel,
} from "@/features/admin/report-view";

const NOW = new Date("2026-07-28T00:00:00Z");
const FUTURE = "2026-08-04T00:00:00Z";
const PAST = "2026-07-01T00:00:00Z";

describe("reportActionState — 조치가 서로를 막지 않는다", () => {
  it("정지된 작성자라도 콘텐츠가 남아 있으면 삭제 가능", () => {
    const s = reportActionState(
      {
        status: "open",
        contentExists: true,
        targetUserId: "u1",
        suspendedUntil: FUTURE,
        bannedAt: null,
      },
      NOW,
    );
    expect(s.banState).toBe("suspended");
    expect(s.canDelete).toBe(true);
    expect(s.canSuspend).toBe(true);
  });

  it("처리완료된 신고여도 삭제·정지 버튼은 살아있다", () => {
    const s = reportActionState(
      { status: "resolved", contentExists: true, targetUserId: "u1" },
      NOW,
    );
    expect(s.resolved).toBe(true);
    expect(s.canDelete).toBe(true);
    expect(s.canSuspend).toBe(true);
  });

  it("이미 삭제된 콘텐츠는 삭제 불가 + '삭제됨' 상태, 정지는 여전히 가능", () => {
    const s = reportActionState(
      { status: "open", contentExists: false, targetUserId: "u1" },
      NOW,
    );
    expect(s.contentDeleted).toBe(true);
    expect(s.canDelete).toBe(false);
    expect(s.canSuspend).toBe(true);
  });

  it("작성자를 모르면(댓글 신고 등 target_user_id 없음) 정지 불가", () => {
    const s = reportActionState(
      { status: "open", contentExists: true, targetUserId: null },
      NOW,
    );
    expect(s.canSuspend).toBe(false);
    expect(s.canDelete).toBe(true);
  });

  it("정지 만료가 지났으면 active", () => {
    const s = reportActionState(
      {
        status: "open",
        contentExists: true,
        targetUserId: "u1",
        suspendedUntil: PAST,
      },
      NOW,
    );
    expect(s.banState).toBe("active");
  });

  it("영구정지는 banned", () => {
    const s = reportActionState(
      {
        status: "open",
        contentExists: true,
        targetUserId: "u1",
        bannedAt: PAST,
      },
      NOW,
    );
    expect(s.banState).toBe("banned");
  });
});

describe("정지 버튼/뱃지 문구", () => {
  it("정지 중이면 '기간 변경'으로 바뀐다", () => {
    expect(suspendButtonLabel("active")).toBe("작성자 정지");
    expect(suspendButtonLabel("suspended")).toBe("정지 기간 변경");
    expect(suspendButtonLabel("banned")).toBe("정지 기간 지정");
  });

  it("정상 회원은 뱃지 없음", () => {
    expect(banBadgeLabel("active", null)).toBeNull();
    expect(banBadgeLabel("banned", null)).toBe("영구정지");
    expect(banBadgeLabel("suspended", null)).toBe("정지 중");
    expect(banBadgeLabel("suspended", FUTURE)).toContain("정지 중");
  });
});