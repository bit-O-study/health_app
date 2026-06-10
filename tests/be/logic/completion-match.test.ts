import { describe, expect, it } from "vitest";

import {
  exerciseCompletionKey,
  resolveTodayStatus,
  type CompletionStatus,
} from "@/features/routine/completion-match";

// 완료는 '사실'이다. 루틴을 바꾸면 운동 행의 UUID 가 새로 생기는데, 그때도 오늘
// 완료한 운동은 완료로 남아야 한다. 매칭은 행 id → (부위:운동) 복합 키 순으로.
// 이 로직이 깨지면 "완료한 운동이 루틴 변경 후 사라지는" 버그가 재발한다.

function mapOf(entries: [string, CompletionStatus][]) {
  return new Map<string, CompletionStatus>(entries);
}

describe("exerciseCompletionKey", () => {
  it("(부위:운동) 복합 키 형식", () => {
    expect(exerciseCompletionKey("chest", "bench-press")).toBe(
      "f:chest:bench-press",
    );
  });

  it("null/undefined 는 빈 문자열로 안정적으로 직렬화", () => {
    expect(exerciseCompletionKey(null, "bench-press")).toBe("f::bench-press");
    expect(exerciseCompletionKey("chest", null)).toBe("f:chest:");
    expect(exerciseCompletionKey(undefined, undefined)).toBe("f::");
  });
});

describe("resolveTodayStatus — 루틴 변경 후 완료 유지", () => {
  it("행 id 가 그대로면 행 id 로 매칭", () => {
    const map = mapOf([["row-1", "done"]]);
    expect(
      resolveTodayStatus(map, {
        id: "row-1",
        focus: "chest",
        exerciseId: "bench-press",
      }),
    ).toBe("done");
  });

  it("🔴 핵심: 행 UUID 가 새로 생겨도 같은 (부위:운동) 이면 완료 유지", () => {
    // 완료 기록은 옛 행 id 와 복합 키 둘 다 들고 있다(getStatusMapToday 가 그렇게 만든다).
    const map = mapOf([
      ["old-row-uuid", "done"],
      [exerciseCompletionKey("chest", "bench-press"), "done"],
    ]);
    // 루틴 변경으로 행 id 가 new-row-uuid 로 바뀌었다.
    expect(
      resolveTodayStatus(map, {
        id: "new-row-uuid",
        focus: "chest",
        exerciseId: "bench-press",
      }),
    ).toBe("done");
  });

  it("이두(arm) 처럼 같은 focus 로 저장되는 운동도 복합 키로 유지", () => {
    const map = mapOf([
      [exerciseCompletionKey("arm", "biceps-curl"), "done"],
    ]);
    expect(
      resolveTodayStatus(map, {
        id: "brand-new-uuid",
        focus: "arm",
        exerciseId: "biceps-curl",
      }),
    ).toBe("done");
  });

  it("완료 안 한 다른 운동은 매칭되지 않는다(거짓 완료 금지)", () => {
    const map = mapOf([
      ["old-row-uuid", "done"],
      [exerciseCompletionKey("chest", "bench-press"), "done"],
    ]);
    // 같은 부위지만 다른 운동(인클라인) — 완료로 잘못 표시되면 안 된다.
    expect(
      resolveTodayStatus(map, {
        id: "another-uuid",
        focus: "chest",
        exerciseId: "incline-press",
      }),
    ).toBeUndefined();
  });

  it("운동은 같아도 부위가 바뀌면 매칭 안 됨(부위별 독립)", () => {
    const map = mapOf([[exerciseCompletionKey("chest", "bench-press"), "done"]]);
    expect(
      resolveTodayStatus(map, {
        id: "x",
        focus: "back",
        exerciseId: "bench-press",
      }),
    ).toBeUndefined();
  });

  it("skipped 도 동일하게 복합 키로 유지", () => {
    const map = mapOf([
      [exerciseCompletionKey("chest", "bench-press"), "skipped"],
    ]);
    expect(
      resolveTodayStatus(map, {
        id: "new-uuid",
        focus: "chest",
        exerciseId: "bench-press",
      }),
    ).toBe("skipped");
  });

  it("행 id 매칭이 복합 키보다 우선", () => {
    const map = mapOf([
      ["row-1", "skipped"],
      [exerciseCompletionKey("chest", "bench-press"), "done"],
    ]);
    // 같은 행의 정확한 상태(skipped)가 복합 키(done)보다 우선해야 한다.
    expect(
      resolveTodayStatus(map, {
        id: "row-1",
        focus: "chest",
        exerciseId: "bench-press",
      }),
    ).toBe("skipped");
  });
});