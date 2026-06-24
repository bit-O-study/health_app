import { describe, expect, it } from "vitest";

import {
  assignCompletions,
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

describe("assignCompletions — 완료 기록 1:1 배정(과매칭 방지)", () => {
  const K = "f:chest:bench-press";

  it("🔴 핵심: 같은 키 행 2개 + 완료 1개 → 한 행만 done", () => {
    const rows = [
      { id: "row-a", key: K },
      { id: "row-b", key: K },
    ];
    // 완료 기록은 row-a 것 1개뿐.
    const { statusById } = assignCompletions(rows, [
      { id: "row-a", key: K, status: "done" },
    ]);
    expect(statusById.get("row-a")).toBe("done");
    expect(statusById.get("row-b")).toBeUndefined();
  });

  it("같은 키 행 2개 + 완료 2개 → 둘 다 done", () => {
    const rows = [
      { id: "row-a", key: K },
      { id: "row-b", key: K },
    ];
    const { statusById } = assignCompletions(rows, [
      { id: "row-a", key: K, status: "done" },
      { id: "row-b", key: K, status: "done" },
    ]);
    expect(statusById.get("row-a")).toBe("done");
    expect(statusById.get("row-b")).toBe("done");
  });

  it("행 id 가 바뀌어도 키로 1개 매칭(완료 유지) — 과매칭 없음", () => {
    const rows = [{ id: "new-uuid", key: K }];
    const { statusById, usedRecord } = assignCompletions(rows, [
      { id: "old-uuid", key: K, status: "done" },
    ]);
    expect(statusById.get("new-uuid")).toBe("done");
    expect(usedRecord[0]).toBe(true);
  });

  it("행 id 직접 매칭이 키 매칭보다 우선(소비 충돌 없음)", () => {
    const rows = [
      { id: "row-a", key: K },
      { id: "row-b", key: K },
    ];
    // row-b 직접 완료 + 키만 맞는 기록 1개 → row-b=직접, row-a=키
    const { statusById } = assignCompletions(rows, [
      { id: "row-b", key: K, status: "skipped" },
      { id: "ghost", key: K, status: "done" },
    ]);
    expect(statusById.get("row-b")).toBe("skipped");
    expect(statusById.get("row-a")).toBe("done");
  });

  it("소비 안 된 기록은 usedRecord=false(고스트 대상)", () => {
    const rows = [{ id: "row-a", key: K }];
    const { usedRecord } = assignCompletions(rows, [
      { id: "row-a", key: K, status: "done" },
      { id: "removed", key: "f:back:pull-up", status: "done" },
    ]);
    expect(usedRecord).toEqual([true, false]);
  });
});