import { describe, expect, it } from "vitest";

import { dropIndex, orderMainPlan } from "@/features/routine/plan-order";

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

describe("dropIndex — 드래그 정렬 목표 위치(가변 행 높이)", () => {
  // 행 높이가 제각각: 80, 120, 60, 100 → 중심 y
  // top: 0,80,200,260 / center: 40,140,230,310
  const centers = [40, 140, 230, 310];

  it("거의 안 움직이면 제자리(no-op)", () => {
    expect(dropIndex(centers, 0, 0)).toBe(0);
    expect(dropIndex(centers, 2, 10)).toBe(2);
  });

  it("키 큰 이웃(120px)을 한 칸만 내려도 한 칸만 이동 (고정80은 2칸 오작동)", () => {
    // source0 중심 40, dy=120 → dragged 160 > center1(140), < center2(230) → target 1
    expect(dropIndex(centers, 0, 120)).toBe(1);
    // 고정 80 가정이면 round(120/80)=2 가 됐을 상황
  });

  it("아래로 여러 칸", () => {
    expect(dropIndex(centers, 0, 220)).toBe(2); // 260 > 230, < 310
    expect(dropIndex(centers, 0, 400)).toBe(3); // 맨 아래
  });

  it("위로 이동", () => {
    // source3 중심 310, dy=-220 → 90 < center1(140) but >center0(40) → target1
    expect(dropIndex(centers, 3, -220)).toBe(1);
    expect(dropIndex(centers, 3, -300)).toBe(0); // 맨 위
  });

  it("짧은 행(60px) 중심만 지나도 인식 — 안 바뀜 버그 방지", () => {
    // source1 중심 140, dy=95 → 235 > center2(230) → target2 (작은 이동도 반영)
    expect(dropIndex(centers, 1, 95)).toBe(2);
  });

  it("범위/예외 방어", () => {
    expect(dropIndex([], 0, 50)).toBe(0);
    expect(dropIndex([10], 0, 50)).toBe(0);
    expect(dropIndex(centers, -1, 50)).toBe(-1);
  });
});
