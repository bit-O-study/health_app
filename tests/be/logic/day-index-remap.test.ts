import { describe, expect, it } from "vitest";

import { planDayIndexRemap } from "@/features/routine/data";

// "다가오는 7일" 드래그 순열에 맞춰 본운동 day_index 를 재매핑하는 순수 함수.
// order[newPos] = 원래 day_index. 저장 시 start_date=오늘 → day_index == 화면 위치.

const IDENTITY = [0, 1, 2, 3, 4, 5, 6];

describe("planDayIndexRemap", () => {
  it("0↔1 스왑: 1일차 운동이 0일차(오늘)로, 0일차 운동이 1일차로 이동", () => {
    // 오늘(d0) 하체 = rdl, 내일(d1) 하체 = squat/leg-press/leg-curl
    const rows = [
      { id: "rdl", day_index: 0 },
      { id: "squat", day_index: 1 },
      { id: "legpress", day_index: 1 },
      { id: "legcurl", day_index: 1 },
    ];
    // 0번 카드를 1번 위치로 끌면 순열은 [1,0,2,3,4,5,6]
    const remap = planDayIndexRemap(rows, [1, 0, 2, 3, 4, 5, 6]);
    const byId = Object.fromEntries(remap.map((r) => [r.id, r.dayIndex]));
    expect(byId).toEqual({ squat: 0, legpress: 0, legcurl: 0, rdl: 1 });
  });

  it("항등 순열이면 아무 행도 옮기지 않는다", () => {
    const rows = [
      { id: "a", day_index: 0 },
      { id: "b", day_index: 3 },
    ];
    expect(planDayIndexRemap(rows, IDENTITY)).toEqual([]);
  });

  it("바뀌지 않는 일차의 행은 결과에서 제외(움직이는 행만 반환)", () => {
    const rows = [
      { id: "d0", day_index: 0 },
      { id: "d2", day_index: 2 }, // 2는 제자리(아래 순열에서 2→2)
      { id: "d1", day_index: 1 },
    ];
    // 0↔1 스왑, 2~6 제자리
    const remap = planDayIndexRemap(rows, [1, 0, 2, 3, 4, 5, 6]);
    const byId = Object.fromEntries(remap.map((r) => [r.id, r.dayIndex]));
    expect(byId).toEqual({ d0: 1, d1: 0 });
    expect("d2" in byId).toBe(false);
  });

  it("회전 순열도 정확히 매핑 (각 카드가 한 칸씩 앞으로)", () => {
    const rows = [
      { id: "x0", day_index: 0 },
      { id: "x1", day_index: 1 },
      { id: "x6", day_index: 6 },
    ];
    // 위치 newPos 의 카드가 원래 (newPos+1)%7 일차 — 전체가 한 칸씩 당겨짐
    const order = [1, 2, 3, 4, 5, 6, 0];
    const remap = planDayIndexRemap(rows, order);
    const byId = Object.fromEntries(remap.map((r) => [r.id, r.dayIndex]));
    expect(byId.x1).toBe(0); // 원래 1일차 → 위치 0
    expect(byId.x6).toBe(5); // 원래 6일차 → 위치 5
    expect(byId.x0).toBe(6); // 원래 0일차 → 위치 6
  });

  it("day_index NULL 행은 건너뛴다", () => {
    const rows = [
      { id: "nul", day_index: null },
      { id: "one", day_index: 1 },
    ];
    const remap = planDayIndexRemap(rows, [1, 0, 2, 3, 4, 5, 6]);
    expect(remap).toEqual([{ id: "one", dayIndex: 0 }]);
  });

  it("순열이 아니면(길이/중복/범위 오류) 빈 배열 — 안전한 무동작", () => {
    const rows = [{ id: "a", day_index: 1 }];
    expect(planDayIndexRemap(rows, [0, 1, 2])).toEqual([]); // 길이 부족
    expect(planDayIndexRemap(rows, [0, 0, 2, 3, 4, 5, 6])).toEqual([]); // 중복
    expect(planDayIndexRemap(rows, [1, 2, 3, 4, 5, 6, 7])).toEqual([]); // 범위 밖
  });
});