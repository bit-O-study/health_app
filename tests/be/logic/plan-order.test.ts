import { describe, expect, it } from "vitest";

import {
  dropIndex,
  groupByFocusWithGlobalPositions,
  keepPosition,
  orderMainPlan,
  resolvePlanAddTarget,
} from "@/features/routine/plan-order";

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

  it("새로 추가한 운동(큰 position)은 멀티 부위에서도 맨 아래로 간다", () => {
    // 가슴(0,1) + 팔(0,1) 기본 + 가슴에 추가한 행(append base 이상)
    const grouped = [
      row("bench", "chest", 0),
      row("incline", "chest", 1),
      row("added", "chest", 1000), // "오늘 운동 추가"로 들어온 행
      row("hammer", "arm", 0),
      row("curl", "arm", 1),
    ];
    expect(orderMainPlan(grouped).map((r) => r.id)).toEqual([
      "bench",
      "incline",
      "hammer",
      "curl",
      "added", // 그룹 중간이 아니라 전체 맨 아래
    ]);
  });

  it("추가분이 여러 개면 추가 순서(position)대로 맨 아래에 쌓인다", () => {
    const grouped = [
      row("bench", "chest", 0),
      row("a2", "chest", 1001),
      row("hammer", "arm", 0),
      row("a1", "arm", 1000),
    ];
    expect(orderMainPlan(grouped).map((r) => r.id)).toEqual([
      "bench",
      "hammer",
      "a1",
      "a2",
    ]);
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

describe("resolvePlanAddTarget — 복합 일차 운동 추가 대상", () => {
  const shoulder = { key: "0:shoulder", label: "어깨" };
  const arm = { key: "0:arm", label: "이두" };

  it("복합 일차는 요청 전 첫 슬롯으로 자동 귀속하지 않는다", () => {
    expect(resolvePlanAddTarget([shoulder, arm])).toBeNull();
  });

  it("사용자가 고른 슬롯을 반환한다", () => {
    expect(resolvePlanAddTarget([shoulder, arm], "0:arm")).toBe(arm);
  });

  it("단일 일차는 선택 메뉴 없이 즉시 추가할 슬롯을 반환한다", () => {
    expect(resolvePlanAddTarget([shoulder])).toBe(shoulder);
  });

  it("없는 슬롯 키는 추가 대상으로 사용하지 않는다", () => {
    expect(resolvePlanAddTarget([shoulder, arm], "0:back")).toBeNull();
  });
});

describe("keepPosition — 행을 옮겨도 순서를 잃지 않는다", () => {
  it("원본 position 을 그대로 쓴다(재인덱싱 금지)", () => {
    expect(keepPosition(3, 0)).toBe(3);
    expect(keepPosition(0, 2)).toBe(0);
    expect(keepPosition(1000, 0)).toBe(1000); // '추가' 표식(append base)도 보존
  });

  it("값이 이상하면 배열 순번으로 폴백한다", () => {
    expect(keepPosition(Number.NaN, 2)).toBe(2);
    expect(keepPosition(-1, 1)).toBe(1);
    expect(keepPosition(1.5, 4)).toBe(4);
  });
});

describe("회귀: '오늘만 부위 추가'(pin) 후에도 부위 교차 순서가 유지된다", () => {
  // 루틴(routine_exercises) — 사용자가 부위 경계를 넘어 끌어 전역 0..3 으로 저장한 상태.
  const routine = [
    row("hammer", "arm", 0),
    row("bench", "chest", 1),
    row("incline", "chest", 2),
    row("curl", "arm", 3),
  ];
  // pin 은 부위별로(getPlanForDay = position 오름차순) daily_plan 에 복사한다.
  const pin = (usePosition: boolean) =>
    ["chest", "arm"].flatMap((focus) =>
      routine
        .filter((r) => r.focus === focus)
        .sort((a, b) => a.position - b.position)
        .map((r, index) => ({
          ...r,
          position: usePosition ? keepPosition(r.position, index) : index,
        })),
    );

  it("원본 position 을 옮기면 사용자가 만든 순서 그대로", () => {
    expect(orderMainPlan(pin(true)).map((r) => r.id)).toEqual([
      "hammer",
      "bench",
      "incline",
      "curl",
    ]);
  });

  it("(버그 재현) 부위별 0..n 으로 재인덱싱하면 그룹 순서로 초기화된다", () => {
    expect(orderMainPlan(pin(false)).map((r) => r.id)).toEqual([
      "bench",
      "incline",
      "hammer",
      "curl",
    ]);
  });
});

describe("groupByFocusWithGlobalPositions — 부위별 저장에도 전역 순서 보존", () => {
  const rows = [
    { id: "hammer", focus: "arm" },
    { id: "bench", focus: "chest" },
    { id: "incline", focus: "chest" },
    { id: "curl", focus: "arm" },
  ];

  it("부위별로 나누되 position 은 한 목록에서의 전역 index 다", () => {
    expect(groupByFocusWithGlobalPositions(rows)).toEqual([
      {
        focus: "arm",
        items: [
          { id: "hammer", focus: "arm", position: 0 },
          { id: "curl", focus: "arm", position: 3 },
        ],
      },
      {
        focus: "chest",
        items: [
          { id: "bench", focus: "chest", position: 1 },
          { id: "incline", focus: "chest", position: 2 },
        ],
      },
    ]);
  });

  it("저장 → 다시 읽기(부위 그룹 순서)로 돌아와도 화면 순서가 복원된다", () => {
    const groups = groupByFocusWithGlobalPositions(rows);
    // 다시 읽을 때는 부위 그룹 순서로 이어 붙는다(today-exercises 의 groupedPlan).
    const reloaded = ["chest", "arm"].flatMap(
      (f) => groups.find((g) => g.focus === f)?.items ?? [],
    );
    expect(orderMainPlan(reloaded).map((r) => r.id)).toEqual([
      "hammer",
      "bench",
      "incline",
      "curl",
    ]);
  });

  it("빈 목록은 빈 배열", () => {
    expect(groupByFocusWithGlobalPositions([])).toEqual([]);
  });
});
