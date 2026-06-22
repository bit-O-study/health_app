import { describe, expect, it } from "vitest";

import {
  adjacentActiveIndex,
  isQueueItemActive,
} from "@/features/workout-timer/queue-filter";

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

// 운동모드 ‹ › 이동 — 이번 세션에 완료/스킵한 운동은 건너뛴다(다시 안 보임).
describe("adjacentActiveIndex", () => {
  const rowIds = ["a", "b", "c", "d"];

  it("아무것도 안 한 상태: 다음/이전은 바로 옆 인덱스", () => {
    expect(adjacentActiveIndex(rowIds, new Set(), 0, 1)).toBe(1);
    expect(adjacentActiveIndex(rowIds, new Set(), 2, -1)).toBe(1);
  });

  it("끝/처음에서 더 갈 곳 없으면 null", () => {
    expect(adjacentActiveIndex(rowIds, new Set(), 3, 1)).toBe(null);
    expect(adjacentActiveIndex(rowIds, new Set(), 0, -1)).toBe(null);
  });

  it("★ 방금 완료한 운동(a)은 ‹ 로 되돌아가도 건너뛴다", () => {
    // b(1)에서 ‹ → a(0)는 완료라 건너뛰고 더 앞이 없으면 null
    expect(adjacentActiveIndex(rowIds, new Set(["a"]), 1, -1)).toBe(null);
  });

  it("완료한 항목들 사이의 활성 항목으로 점프(앞/뒤)", () => {
    const processed = new Set(["b", "c"]);
    // a(0)에서 다음 → b,c 건너뛰고 d(3)
    expect(adjacentActiveIndex(rowIds, processed, 0, 1)).toBe(3);
    // d(3)에서 이전 → c,b 건너뛰고 a(0)
    expect(adjacentActiveIndex(rowIds, processed, 3, -1)).toBe(0);
  });

  it("현재 인덱스 자신은 반환하지 않는다", () => {
    expect(adjacentActiveIndex(rowIds, new Set(), 1, 1)).toBe(2);
    expect(adjacentActiveIndex(rowIds, new Set(), 1, -1)).toBe(0);
  });
});
