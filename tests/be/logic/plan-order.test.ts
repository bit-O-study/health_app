import { describe, expect, it } from "vitest";

import { orderMainPlan } from "@/features/routine/plan-order";

type Row = { id: string; focus: string; position: number };
const row = (id: string, focus: string, position: number): Row => ({
  id,
  focus,
  position,
});

describe("orderMainPlan — 본운동 부위 교차 순서", () => {
  it("기본(멀티 부위, 부위마다 0..n)에서는 부위 그룹 순서를 유지한다", () => {
    // 가슴(0,1) + 팔(0,1) 을 그룹 순서로 이어 붙인 입력
    const grouped = [
      row("bench", "chest", 0),
      row("incline", "chest", 1),
      row("hammer", "arm", 0),
      row("curl", "arm", 1),
    ];
    expect(orderMainPlan(grouped).map((r) => r.id)).toEqual([
      "bench",
      "incline",
      "hammer",
      "curl",
    ]);
  });

  it("부위 경계를 넘어 재정렬(전역 position 고유)되면 position 순을 따른다", () => {
    // 사용자가 팔 해머컬을 가슴 벤치프레스보다 앞으로 끌어 전역 0..3 으로 재저장된 상태.
    // 입력은 여전히 부위 그룹 순서(가슴 먼저)로 들어오지만 position 이 교차한다.
    const grouped = [
      row("bench", "chest", 1),
      row("incline", "chest", 3),
      row("hammer", "arm", 0),
      row("curl", "arm", 2),
    ];
    expect(orderMainPlan(grouped).map((r) => r.id)).toEqual([
      "hammer",
      "bench",
      "curl",
      "incline",
    ]);
  });

  it("두 부위가 각각 1개면 position 으로 교차 정렬된다", () => {
    const grouped = [row("bench", "chest", 1), row("hammer", "arm", 0)];
    expect(orderMainPlan(grouped).map((r) => r.id)).toEqual(["hammer", "bench"]);
  });

  it("3개 이상 부위 기본 상태도 부위 그룹 순서를 유지한다", () => {
    // 가슴(0,1) + 등(0,1) + 팔(0,1) — 부위마다 position 이 겹침
    const grouped = [
      row("bench", "chest", 0),
      row("fly", "chest", 1),
      row("row", "back", 0),
      row("pulldown", "back", 1),
      row("hammer", "arm", 0),
      row("curl", "arm", 1),
    ];
    expect(orderMainPlan(grouped).map((r) => r.id)).toEqual([
      "bench",
      "fly",
      "row",
      "pulldown",
      "hammer",
      "curl",
    ]);
  });

  it("3개 이상 부위를 교차 재정렬해도(전역 position) 그 순서를 따른다", () => {
    // 사용자가 3부위를 자유롭게 섞어 전역 0..5 로 재저장한 상태.
    // 입력은 부위 그룹 순서(가슴→등→팔)로 들어오지만 position 이 교차한다.
    const grouped = [
      row("bench", "chest", 2),
      row("fly", "chest", 5),
      row("row", "back", 0),
      row("pulldown", "back", 3),
      row("hammer", "arm", 1),
      row("curl", "arm", 4),
    ];
    expect(orderMainPlan(grouped).map((r) => r.id)).toEqual([
      "row", // 0
      "hammer", // 1
      "bench", // 2
      "pulldown", // 3
      "curl", // 4
      "fly", // 5
    ]);
  });

  it("단일 부위는 입력 순서를 그대로 둔다", () => {
    const grouped = [
      row("a", "chest", 0),
      row("b", "chest", 1),
      row("c", "chest", 2),
    ];
    expect(orderMainPlan(grouped).map((r) => r.id)).toEqual(["a", "b", "c"]);
  });

  it("0~1개 항목은 그대로 반환", () => {
    expect(orderMainPlan([])).toEqual([]);
    expect(orderMainPlan([row("only", "arm", 5)]).map((r) => r.id)).toEqual([
      "only",
    ]);
  });
});
