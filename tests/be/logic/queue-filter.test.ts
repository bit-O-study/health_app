import { describe, expect, it } from "vitest";

import { isQueueItemActive } from "@/features/workout-timer/queue-filter";

// '운동 시작' 큐 필터 — 로컬 오버라이드(방금 스킵/취소)가 서버 상태보다 우선.
// 회귀: 휴식(스킵) 취소 후 바로 시작하면 그 운동이 큐에 떠야 한다.

describe("isQueueItemActive", () => {
  const inactive = new Set(["a", "b"]); // 서버에서 완료/스킵된 행

  it("서버 완료/스킵 + 오버라이드 없음 → 제외(active=false)", () => {
    expect(isQueueItemActive("a", inactive, {})).toBe(false);
    expect(isQueueItemActive("b", inactive, null)).toBe(false);
  });

  it("서버 active + 오버라이드 없음 → 포함", () => {
    expect(isQueueItemActive("c", inactive, {})).toBe(true);
  });

  it("★ 휴식(스킵) 취소: 서버는 스킵인데 로컬 active → 즉시 큐에 포함", () => {
    expect(isQueueItemActive("a", inactive, { a: "active" })).toBe(true);
  });

  it("방금 로컬 스킵: 서버는 active인데 로컬 skipped → 즉시 제외", () => {
    expect(isQueueItemActive("c", inactive, { c: "skipped" })).toBe(false);
  });

  it("로컬 완료 → 제외", () => {
    expect(isQueueItemActive("c", inactive, { c: "done" })).toBe(false);
  });
});
